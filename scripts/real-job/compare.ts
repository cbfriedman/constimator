// Standalone script — not part of the Next.js app. Puts what the AI
// extracted next to what you know is correct, and classifies every row, so
// accuracy on a real job is something you read off a table instead of
// eyeballing two documents side by side.
//
// Nothing here judges the result for you beyond the mechanical checks
// (matched / quantity / unit): a description the model reworded is reported
// as a difference, not as an error, because whether that matters is a call
// only you can make.
//
// Usage:
//   node --env-file=.env.local scripts/real-job/compare.ts --document <id> --expected <csv>
//   node --env-file=.env.local scripts/real-job/compare.ts --project 24-118 --expected <csv>
//
// Options:
//   --document <id>       Compare this document's latest complete job.
//   --project <number>    ...or the latest processed document on this project.
//   --org <slug>          Required if the database has more than one org.
//   --expected <csv>      Your known-correct list. Headers are matched loosely:
//                         item/item_number, description, unit, quantity, spec_section.
//                         Omit to use the project's manually-entered bid rows
//                         as the expected list instead.
//   --tolerance-pct <n>   Quantity tolerance, percent. Default 0 (exact).
//   --report <dir>        Where to write the JSON/CSV report. Default
//                         scripts/real-job/reports (gitignored).

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

import postgres from "postgres"

type Row = {
  itemNumber: string
  description: string
  unit: string
  quantity: number
  specSection?: string
  confidence?: number
  notes?: string
}

type Verdict =
  | "exact"
  | "quantity_mismatch"
  | "unit_mismatch"
  | "missing"
  | "extra"

type Comparison = {
  verdict: Verdict
  descriptionDiffers: boolean
  expected?: Row
  extracted?: Row
  note?: string
}

const DEFAULT_REPORT_DIR = join("scripts", "real-job", "reports")

function parseArgs(argv: string[]) {
  const flags = new Map<string, string>()
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith("--")) continue
    const value = argv[++i]
    if (value === undefined) throw new Error(`--${arg.slice(2)} needs a value`)
    flags.set(arg.slice(2), value)
  }
  if (!flags.has("document") && !flags.has("project")) {
    throw new Error("Pass --document <id> or --project <number>.")
  }
  return {
    document: flags.get("document"),
    project: flags.get("project"),
    org: flags.get("org"),
    expected: flags.get("expected"),
    tolerancePct: Number(flags.get("tolerance-pct") ?? 0),
    reportDir: flags.get("report") ?? DEFAULT_REPORT_DIR,
  }
}

// ---------------------------------------------------------------------------
// Normalizing + matching. The rules deliberately match lib/reconciliation-diff.ts's
// spirit: normalize whitespace/case, and never guess when a key is ambiguous —
// two unmatched rows reported honestly beat one confidently wrong pairing,
// because a wrong pairing shows up as two *content* errors and misattributes
// what the model actually got wrong.
// ---------------------------------------------------------------------------

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function normalizeItemNumber(value: string): string {
  // "01", "1.", "1 " and "1" are the same item to a human reading the form.
  return normalize(value).replace(/[.\s]+$/, "").replace(/^0+(?=\d)/, "")
}

function parseNumber(value: string): number {
  return Number(value.replace(/[$,\s]/g, ""))
}

function tokens(value: string): Set<string> {
  return new Set(normalize(value).split(/[^a-z0-9]+/).filter(Boolean))
}

/** Token overlap, only ever used to *suggest* a near-miss to a human reader. */
function similarity(a: string, b: string): number {
  const ta = tokens(a)
  const tb = tokens(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let shared = 0
  for (const token of ta) if (tb.has(token)) shared++
  return shared / (ta.size + tb.size - shared)
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') {
      quoted = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else if (char !== "\r") {
      field += char
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0))
}

const HEADER_ALIASES: Record<keyof Row | "ignore", string[]> = {
  itemNumber: ["item", "item_number", "itemnumber", "item no", "item no.", "no", "no.", "#", "bid item"],
  description: ["description", "desc", "item description", "bid item description"],
  unit: ["unit", "uom", "unit of measure", "units"],
  quantity: ["quantity", "qty", "official_quantity", "estimated quantity", "est. quantity", "plan quantity"],
  specSection: ["spec_section", "spec", "spec section", "section"],
  confidence: [],
  notes: [],
  ignore: [],
}

function readExpectedCsv(text: string, path: string): Row[] {
  const rows = parseCsv(text)
  if (rows.length < 2) throw new Error(`${path} has no data rows.`)

  const header = rows[0].map((cell) => normalize(cell))
  const index: Partial<Record<keyof Row, number>> = {}
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const position = header.findIndex((cell) => aliases.includes(cell))
    if (position >= 0) index[field as keyof Row] = position
  }

  const missing = (["description", "unit", "quantity"] as const).filter((f) => index[f] === undefined)
  if (missing.length > 0) {
    throw new Error(
      `${path} is missing column(s): ${missing.join(", ")}. Found headers: ${header.join(", ")}`,
    )
  }

  return rows.slice(1).map((cells, i) => ({
    itemNumber:
      index.itemNumber !== undefined ? (cells[index.itemNumber] ?? "").trim() : String(i + 1),
    description: (cells[index.description!] ?? "").trim(),
    unit: (cells[index.unit!] ?? "").trim(),
    quantity: parseNumber(cells[index.quantity!] ?? ""),
    specSection:
      index.specSection !== undefined ? (cells[index.specSection] ?? "").trim() || undefined : undefined,
  }))
}

function compare(expected: Row[], extracted: Row[], tolerancePct: number): Comparison[] {
  const unmatchedExtracted = new Map(extracted.map((row, i) => [i, row]))
  const results: Comparison[] = []

  const takeMatch = (predicate: (row: Row) => boolean): Row | undefined => {
    const hits = [...unmatchedExtracted].filter(([, row]) => predicate(row))
    if (hits.length !== 1) return undefined
    const [key, row] = hits[0]
    unmatchedExtracted.delete(key)
    return row
  }

  for (const want of expected) {
    const wantItem = normalizeItemNumber(want.itemNumber)
    const wantDescription = normalize(want.description)

    const got =
      (wantItem
        ? takeMatch((row) => normalizeItemNumber(row.itemNumber) === wantItem)
        : undefined) ?? takeMatch((row) => normalize(row.description) === wantDescription)

    if (!got) {
      // Nothing matched on either key. Point at the closest surviving row so
      // a near-miss (reworded description, mangled item number) is visible as
      // one, rather than showing up as an unexplained missing/extra pair.
      let best: { row: Row; score: number } | undefined
      for (const [, row] of unmatchedExtracted) {
        const score = similarity(want.description, row.description)
        if (!best || score > best.score) best = { row, score }
      }
      results.push({
        verdict: "missing",
        descriptionDiffers: false,
        expected: want,
        note:
          best && best.score >= 0.5
            ? `closest unmatched extraction: "${best.row.description}" (item ${best.row.itemNumber})`
            : undefined,
      })
      continue
    }

    const descriptionDiffers = normalize(got.description) !== wantDescription
    const unitMatches = normalize(got.unit) === normalize(want.unit)
    const allowed = Math.abs(want.quantity) * (tolerancePct / 100)
    const quantityMatches = Math.abs(got.quantity - want.quantity) <= allowed

    const verdict: Verdict = !unitMatches
      ? "unit_mismatch"
      : !quantityMatches
        ? "quantity_mismatch"
        : "exact"

    results.push({ verdict, descriptionDiffers, expected: want, extracted: got })
  }

  for (const [, row] of unmatchedExtracted) {
    results.push({ verdict: "extra", descriptionDiffers: false, extracted: row })
  }

  return results
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function pad(value: string, width: number): string {
  const text = value.length > width ? `${value.slice(0, width - 1)}…` : value
  return text.padEnd(width)
}

const VERDICT_LABEL: Record<Verdict, string> = {
  exact: "ok",
  quantity_mismatch: "QTY",
  unit_mismatch: "UNIT",
  missing: "MISSING",
  extra: "EXTRA",
}

function printTable(results: Comparison[]) {
  console.log("")
  console.log(
    `${pad("verdict", 8)}${pad("item", 6)}${pad("description", 40)}${pad("expected", 22)}${pad("extracted", 22)}${pad("conf", 5)}`,
  )
  console.log("-".repeat(103))

  for (const result of results) {
    const row = result.expected ?? result.extracted!
    const expectedCell = result.expected
      ? `${result.expected.quantity} ${result.expected.unit}`
      : "—"
    const extractedCell = result.extracted
      ? `${result.extracted.quantity} ${result.extracted.unit}`
      : "—"
    const confidence = result.extracted?.confidence
    console.log(
      pad(VERDICT_LABEL[result.verdict], 8) +
        pad(row.itemNumber, 6) +
        pad(row.description, 40) +
        pad(expectedCell, 22) +
        pad(extractedCell, 22) +
        pad(confidence === undefined ? "" : String(confidence), 5),
    )
    if (result.descriptionDiffers && result.extracted) {
      console.log(`${" ".repeat(14)}extracted description: "${result.extracted.description}"`)
    }
    if (result.note) console.log(`${" ".repeat(14)}${result.note}`)
    if (result.extracted?.notes) console.log(`${" ".repeat(14)}model notes: ${result.extracted.notes}`)
  }
}

function printSummary(results: Comparison[], tolerancePct: number) {
  const expectedCount = results.filter((r) => r.verdict !== "extra").length
  const found = results.filter((r) => r.extracted && r.expected)
  const exact = results.filter((r) => r.verdict === "exact")
  const cleanText = exact.filter((r) => !r.descriptionDiffers)
  const counts = {
    quantity_mismatch: results.filter((r) => r.verdict === "quantity_mismatch").length,
    unit_mismatch: results.filter((r) => r.verdict === "unit_mismatch").length,
    missing: results.filter((r) => r.verdict === "missing").length,
    extra: results.filter((r) => r.verdict === "extra").length,
  }
  const pct = (n: number) => (expectedCount === 0 ? "0.0" : ((n / expectedCount) * 100).toFixed(1))

  console.log("")
  console.log(`Expected items            : ${expectedCount}`)
  console.log(`Matched to an extraction  : ${found.length} (${pct(found.length)}%)`)
  console.log(
    `Quantity + unit correct   : ${exact.length} (${pct(exact.length)}%)${tolerancePct > 0 ? ` — within ±${tolerancePct}%` : ""}`,
  )
  console.log(`...and description verbatim: ${cleanText.length} (${pct(cleanText.length)}%)`)
  console.log(`Quantity wrong            : ${counts.quantity_mismatch}`)
  console.log(`Unit wrong                : ${counts.unit_mismatch}`)
  console.log(`Missed entirely           : ${counts.missing}`)
  console.log(`Invented / unexpected     : ${counts.extra}`)

  // The model's own confidence is only worth anything if it's lower on the
  // rows it got wrong — that's what makes a review-the-low-confidence-rows
  // workflow viable, so it's measured rather than assumed.
  const withConfidence = results.filter((r) => r.extracted?.confidence !== undefined && r.expected)
  if (withConfidence.length > 0) {
    const mean = (rows: Comparison[]) =>
      rows.length === 0
        ? null
        : (rows.reduce((sum, r) => sum + (r.extracted!.confidence ?? 0), 0) / rows.length).toFixed(1)
    const right = withConfidence.filter((r) => r.verdict === "exact")
    const wrong = withConfidence.filter((r) => r.verdict !== "exact")
    console.log("")
    console.log(`Mean self-confidence, correct rows : ${mean(right) ?? "n/a"}`)
    console.log(`Mean self-confidence, wrong rows   : ${mean(wrong) ?? "n/a"}`)
  }
}

function toReportCsv(results: Comparison[]): string {
  const escape = (value: unknown) => {
    const text = value === undefined || value === null ? "" : String(value)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const lines = [
    [
      "verdict",
      "description_differs",
      "expected_item",
      "expected_description",
      "expected_unit",
      "expected_quantity",
      "extracted_item",
      "extracted_description",
      "extracted_unit",
      "extracted_quantity",
      "confidence",
      "model_notes",
      "note",
    ].join(","),
  ]
  for (const r of results) {
    lines.push(
      [
        r.verdict,
        r.descriptionDiffers,
        r.expected?.itemNumber,
        r.expected?.description,
        r.expected?.unit,
        r.expected?.quantity,
        r.extracted?.itemNumber,
        r.extracted?.description,
        r.extracted?.unit,
        r.extracted?.quantity,
        r.extracted?.confidence,
        r.extracted?.notes,
        r.note,
      ]
        .map(escape)
        .join(","),
    )
  }
  return `${lines.join("\n")}\n`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL is not set")

  const sql = postgres(connectionString, { prepare: false })

  try {
    const orgs = args.org
      ? await sql`select id, slug, name from public.org where slug = ${args.org}`
      : await sql`select id, slug, name from public.org`
    if (orgs.length === 0) throw new Error("No matching org.")
    if (orgs.length > 1) {
      throw new Error(
        `Multiple orgs exist (${orgs.map((o) => o.slug).join(", ")}) — pass one with --org.`,
      )
    }
    const org = orgs[0]

    let documentId = args.document
    let projectId: string | undefined

    if (args.project) {
      const [project] = await sql`
        select id from public.project where org_id = ${org.id} and number = ${args.project}
      `
      if (!project) throw new Error(`No project #${args.project} for org "${org.name}".`)
      projectId = project.id
      if (!documentId) {
        const [latest] = await sql`
          select id from public.document
          where org_id = ${org.id} and project_id = ${project.id}
          order by created_at desc limit 1
        `
        if (!latest) throw new Error(`Project #${args.project} has no uploaded documents.`)
        documentId = latest.id
      }
    }

    if (!documentId) throw new Error("Pass --document <id> or --project <number>.")

    const [document] = await sql`
      select id, project_id, file_name, type, status
      from public.document
      where id = ${documentId} and org_id = ${org.id}
    `
    if (!document) throw new Error(`No document ${documentId} in org "${org.name}".`)
    // The document is the source of truth for which project this is, even
    // when --project named one: a document id from another project would
    // otherwise be compared against the wrong project's bid rows.
    projectId = document.project_id as string

    const [job] = await sql`
      select id, status, error, result
      from public.takeoff_job
      where document_id = ${document.id} and org_id = ${org.id}
      order by created_at desc limit 1
    `
    if (!job) throw new Error(`Document ${document.id} has no takeoff job.`)
    if (job.status !== "complete") {
      throw new Error(
        `Latest job for ${document.file_name} is "${job.status}"${job.error ? ` — ${job.error}` : ""}.`,
      )
    }

    const kind = job.result?.kind ?? "plan_takeoff"
    const extracted: Row[] = (
      kind === "bid_form" ? (job.result?.bidItems ?? []) : (job.result?.items ?? [])
    ).map((item: Record<string, unknown>, i: number) => ({
      itemNumber: String(item.itemNumber ?? i + 1),
      description: String(item.description ?? ""),
      unit: String(item.unit ?? ""),
      quantity: Number(item.quantity ?? 0),
      specSection: item.specSection as string | undefined,
      confidence: item.confidence as number | undefined,
      notes: item.notes as string | undefined,
    }))

    let expected: Row[]
    let expectedSource: string
    if (args.expected) {
      expected = readExpectedCsv(await readFile(args.expected, "utf8"), args.expected)
      expectedSource = args.expected
    } else {
      const bidRows = await sql`
        select item_number, description, unit, official_quantity, spec_section
        from public.bid where project_id = ${projectId} and org_id = ${org.id}
        order by created_at
      `
      if (bidRows.length === 0) {
        throw new Error(
          "No --expected CSV given and this project has no manually-entered bid rows to compare against.",
        )
      }
      expected = bidRows.map((row) => ({
        itemNumber: String(row.item_number),
        description: String(row.description),
        unit: String(row.unit),
        quantity: Number(row.official_quantity),
        specSection: row.spec_section ?? undefined,
      }))
      expectedSource = `public.bid rows for this project (${bidRows.length})`
    }

    console.log(`Document : ${document.file_name} (${document.type}, ${document.id})`)
    console.log(`Job      : ${job.id} — ${kind}, ${extracted.length} items extracted`)
    console.log(`Expected : ${expectedSource} — ${expected.length} items`)

    const results = compare(expected, extracted, args.tolerancePct)
    printTable(results)
    printSummary(results, args.tolerancePct)

    await mkdir(args.reportDir, { recursive: true })
    const stamp = `${document.id}-${job.id}`
    const jsonPath = join(args.reportDir, `${stamp}.json`)
    const csvPath = join(args.reportDir, `${stamp}.csv`)
    await writeFile(
      jsonPath,
      `${JSON.stringify(
        {
          document: { id: document.id, fileName: document.file_name, type: document.type },
          job: { id: job.id, kind },
          expectedSource,
          tolerancePct: args.tolerancePct,
          results,
        },
        null,
        2,
      )}\n`,
    )
    await writeFile(csvPath, toReportCsv(results))
    console.log(`\nReport written to ${jsonPath}\n              and ${csvPath}`)
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
