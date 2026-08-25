// Throwaway spike — NOT part of the Next.js app, NOT wired into anything.
//
// Companion to spike-dir.ts. Answers: what does CSLB publish, what does it
// cost, what is the authoritative classification vocabulary, and how much of
// DIR actually joins to it on licence number?
//
// The headline the spike found: there is nothing to buy. CSLB's Public Data
// Portal publishes the statewide master file as a free direct download —
// "Fee: There is no charge for this service." A bulk-file pricing request was
// on the plan as day-one calendar time; it is not needed.
//
// DNS note: www.cslb.ca.gov did not resolve from this machine (the VPN
// resolver has no A record for it) while the apex cslb.ca.gov did, and the
// apex serves the same app. Everything here uses the apex host.
//
// Usage (no install step — Node 22.18+ / 24+ native TypeScript):
//   node scripts/registry/spike-cslb.ts portal
//   node scripts/registry/spike-cslb.ts classifications [out.json]
//   node scripts/registry/spike-cslb.ts master [out.csv]
//   node scripts/registry/spike-cslb.ts vocabulary <master.csv> [classifications.json]
//   node scripts/registry/spike-cslb.ts match <dir-sample.ndjson> <master.csv>
//
// No env vars, no database, no credentials.

const HOST = "https://cslb.ca.gov"
const PORTAL = `${HOST}/onlineservices/Dataportal`
const CLASSIFICATIONS = `${HOST}/About_Us/Library/Licensing_Classifications/`
const C61 = `${CLASSIFICATIONS}C-61_Limited_Specialty/Default.aspx`

// The portal's download buttons are ASP.NET __doPostBack calls, but the
// postback just redirects to this handler, which serves the file with no
// cookie or token of its own. fName is one of MasterLicenseData /
// WorkerCompData / PersonnelData; type is C for CSV, E for Excel.
const DOWNLOAD = `${HOST}/OnlineServices/DataPortal/DownLoadFile.ashx`

const UA = "Mozilla/5.0 (Constimator source spike; one-off evaluation)"

const get = async (url: string) => {
  const res = await fetch(url, { headers: { "user-agent": UA, referer: `${PORTAL}/` } })
  if (!res.ok) throw new Error(`http ${res.status} for ${url}`)
  return res.text()
}

// Enough to read CSLB's static ASP.NET pages; not a general HTML parser.
const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;|&#8217;/g, "’")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n")

const section = (body: string, from: string, chars = 1200) => {
  const i = body.indexOf(from)
  return i < 0 ? `(section "${from}" not found)` : body.slice(i, i + chars)
}

// --- commands ---------------------------------------------------------------

// What the Public Data Portal offers, in its own words — including the fee and
// format lines, which are the whole reason the pricing request was on the plan.
async function portal() {
  const pages: [string, string][] = [
    ["Master list", `${PORTAL}/ContractorList.aspx`],
    ["By classification", `${PORTAL}/ListByClassification.aspx`],
    ["By classification + county", `${PORTAL}/ListByCounty.aspx`],
  ]
  for (const [label, url] of pages) {
    const body = text(await get(url))
    console.log(`\n${"=".repeat(70)}\n${label}  —  ${url}\n${"=".repeat(70)}`)
    for (const heading of ["What can I Download?", "Format", "Fee"]) {
      console.log(`\n-- ${heading} --`)
      console.log(section(body, heading, heading === "What can I Download?" ? 900 : 200))
    }
  }

  console.log(`\n${"=".repeat(70)}\nDirect download handler\n${"=".repeat(70)}`)
  for (const fName of ["MasterLicenseData", "WorkerCompData", "PersonnelData"]) {
    const url = `${DOWNLOAD}?fName=${fName}&type=C`
    // The handler ignores Range and streams the whole file regardless, so read
    // one chunk for the header row and hang up rather than pull tens of MB.
    const res = await fetch(url, { headers: { "user-agent": UA } })
    const reader = res.body?.getReader()
    const chunk = await reader?.read()
    await reader?.cancel()
    const head = new TextDecoder().decode(chunk?.value ?? new Uint8Array()).split(/\r?\n/)[0]
    console.log(`\n${fName}: http=${res.status} content-type=${res.headers.get("content-type")}`)
    console.log(`  ${url}`)
    console.log(`  header row: ${head.slice(0, 300)}${head.length > 300 ? "…" : ""}`)
  }
}

// The trade vocabulary. This is the list the recipient picker gets built on, so
// it is scraped from CSLB's own pages rather than transcribed by hand.
async function classifications(out?: string) {
  const main = await get(CLASSIFICATIONS)
  // Every classification on the index links to its own detail page, and the
  // Class= param is the authoritative code. Note the codes are written
  // inconsistently in the URLs (C-2 but C10), so the label is the source of
  // truth for the code and the URL only tells us which links are real.
  const linked = [...main.matchAll(/Licensing_Classifications_Detail\.aspx\?Class=([^"&]+)"[^>]*>([^<]+)</g)]
  const primary = linked.map(([, urlCode, label]) => {
    const clean = label.replace(/&amp;/g, "&").trim()
    const code = clean.match(/^([A-Z]-?\d*(?:-\d)?)\s+-\s+/)?.[1] ?? urlCode
    return { code, label: clean.replace(/^[A-Z]-?\d*(?:-\d)?\s+-\s+/, ""), urlCode }
  })

  const certs = [
    { code: "ASB", label: "Asbestos Certification" },
    { code: "HAZ", label: "Hazardous Substance Removal Certification" },
  ]

  // C-61 Limited Specialty is a single licence classification subdivided into
  // "D" subcategories. Many are retired and redirect to another class — that
  // note matters, because a retired D-code still shows up on old licences.
  const c61Body = text(await get(C61))
  const sub: { code: string; label: string; supersededBy?: string }[] = []
  const lines = c61Body.split("\n")
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(D-?\d+)\s*[-–]\s*(.+)$/)
    if (!m) continue
    const code = m[1].replace(/^D-?/, "D-")
    let label = m[2].trim()
    let supersededBy: string | undefined
    // The "(Now under X)" / "(Converted to X)" note is sometimes inline and
    // sometimes on the following lines, because the class names are links.
    const inline = label.match(/\((?:Now under|Converted to)\s+(.+?)\)$/i)
    if (inline) {
      supersededBy = inline[1].replace(/"/g, "").trim()
      label = label.replace(/\((?:Now under|Converted to).*$/i, "").trim()
    } else if (/^\((?:Now under|Converted to)/i.test(lines[i + 1] ?? "")) {
      const tail: string[] = []
      for (let j = i + 1; j < lines.length && !/^D-?\d+\s/.test(lines[j]); j++) tail.push(lines[j])
      supersededBy = tail
        .join(" ")
        .replace(/^\((?:Now under|Converted to)\s*/i, "")
        .replace(/\)\s*$/, "")
        .replace(/"/g, "")
        .trim()
    }
    sub.push({ code, label, ...(supersededBy ? { supersededBy } : {}) })
  }

  const result = {
    source: { primary: CLASSIFICATIONS, c61: C61 },
    retrieved: new Date().toISOString().slice(0, 10),
    primary,
    certifications: certs,
    c61Subcategories: sub,
  }

  console.log(`primary classifications: ${primary.length}`)
  for (const c of primary) console.log(`  ${c.code.padEnd(6)} ${c.label}`)
  console.log(`\ncertifications: ${certs.length}`)
  for (const c of certs) console.log(`  ${c.code.padEnd(6)} ${c.label}`)
  console.log(`\nC-61 "D" subcategories: ${sub.length} (${sub.filter((s) => s.supersededBy).length} retired/redirected)`)
  for (const c of sub) {
    console.log(`  ${c.code.padEnd(6)} ${c.label}${c.supersededBy ? `   -> now under ${c.supersededBy}` : ""}`)
  }

  if (out) {
    const { writeFileSync } = await import("node:fs")
    writeFileSync(out, JSON.stringify(result, null, 2) + "\n")
    console.log(`\nwrote ${out}`)
  }
}

// Pulls the statewide master file. It is large — the run behind the doc was
// ~78 MB / ~244k licences in about a minute.
async function master(out: string) {
  const { createWriteStream } = await import("node:fs")
  const { Readable } = await import("node:stream")
  const { pipeline } = await import("node:stream/promises")
  const url = `${DOWNLOAD}?fName=MasterLicenseData&type=C`
  const started = Date.now()
  const res = await fetch(url, { headers: { "user-agent": UA, referer: `${PORTAL}/ContractorList.aspx` } })
  if (!res.ok || !res.body) throw new Error(`http ${res.status} for ${url}`)
  console.log(`downloading ${url}`)
  await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(out))
  const { statSync } = await import("node:fs")
  const bytes = statSync(out).size
  console.log(`wrote ${out} — ${(bytes / 1e6).toFixed(1)} MB in ${((Date.now() - started) / 1000).toFixed(1)}s`)
}

// CSLB writes classification codes differently in the master file than on the
// classifications pages: single-digit C classes keep the hyphen (C-8), two-digit
// ones drop it (C10), and C-61 "D" subcategories are zero-padded with no hyphen
// (D03 for D-3). Anything reading the data has to normalise before it can join
// to the published vocabulary.
const canonicalCode = (token: string) => {
  const t = token.trim().toUpperCase()
  const m = t.match(/^([A-Z])-?0*(\d+)$/)
  if (!m) return t
  return `${m[1]}-${Number(m[2])}`
}

// Reconciles what CSLB publishes as the classification list against what
// actually appears in the master file. The gap in both directions is the thing
// the recipient picker has to cope with.
async function vocabulary(masterPath: string, classificationsPath?: string) {
  const { createReadStream, readFileSync } = await import("node:fs")
  const { createInterface } = await import("node:readline")

  const published = classificationsPath
    ? (JSON.parse(readFileSync(classificationsPath, "utf8")) as {
        primary: { code: string; label: string }[]
        certifications: { code: string; label: string }[]
        c61Subcategories: { code: string; label: string; supersededBy?: string }[]
      })
    : null
  if (!published) {
    console.log("(no classifications.json given — run `classifications out.json` first to get the two-way diff)\n")
  }

  const observed = new Map<string, number>()
  const separators = new Set<string>()
  let header: string[] = []
  let licences = 0
  const rl = createInterface({ input: createReadStream(masterPath, { encoding: "utf8" }), crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line.trim()) continue
    const cols = splitCsv(line)
    if (!header.length) {
      header = cols
      continue
    }
    licences++
    const raw = cols[header.indexOf("Classifications(s)")] ?? ""
    if (raw.includes("|")) separators.add("| (pipe)")
    for (const token of raw.split(/[|,\s]+/).filter(Boolean)) {
      observed.set(token, (observed.get(token) ?? 0) + 1)
    }
  }

  console.log(`master file: ${licences.toLocaleString()} licences`)
  console.log(`multi-class separator: ${[...separators].join(", ") || "(none seen)"}`)
  console.log(`distinct classification tokens in the data: ${observed.size}\n`)

  const ranked = [...observed.entries()].sort((a, b) => b[1] - a[1])
  console.log("token".padEnd(8), "canonical".padEnd(10), "licences")
  for (const [token, n] of ranked) {
    const canon = canonicalCode(token)
    console.log(token.padEnd(8), (canon === token ? "" : canon).padEnd(10), String(n).padStart(8))
  }

  if (!published) return

  const publishedCodes = new Map<string, string>()
  for (const c of published.primary) publishedCodes.set(canonicalCode(c.code), c.label)
  for (const c of published.certifications) publishedCodes.set(canonicalCode(c.code), c.label)
  for (const c of published.c61Subcategories) {
    publishedCodes.set(canonicalCode(c.code), c.label + (c.supersededBy ? ` (retired — now under ${c.supersededBy})` : ""))
  }

  const observedCanon = new Map<string, number>()
  for (const [token, n] of observed) {
    const canon = canonicalCode(token)
    observedCanon.set(canon, (observedCanon.get(canon) ?? 0) + n)
  }

  const unknown = [...observedCanon.entries()].filter(([code]) => !publishedCodes.has(code))
  const unused = [...publishedCodes.keys()].filter((code) => !observedCanon.has(code))
  const retiredButLive = [...observedCanon.entries()].filter(([code]) =>
    published.c61Subcategories.some((s) => canonicalCode(s.code) === code && s.supersededBy),
  )

  console.log(`\n== reconciliation ==`)
  console.log(`  published codes                ${publishedCodes.size}`)
  console.log(`  codes present in the data      ${observedCanon.size}`)
  console.log(`\n  in the data but not published (${unknown.length}):`)
  for (const [code, n] of unknown.sort((a, b) => b[1] - a[1])) console.log(`    ${code.padEnd(8)} ${String(n).padStart(7)}`)
  console.log(`\n  published but never used (${unused.length}):`)
  for (const code of unused) console.log(`    ${code.padEnd(8)} ${publishedCodes.get(code)}`)
  console.log(`\n  retired C-61 subcategories still on live licences (${retiredButLive.length}):`)
  for (const [code, n] of retiredButLive.sort((a, b) => b[1] - a[1])) {
    console.log(`    ${code.padEnd(8)} ${String(n).padStart(7)}  ${publishedCodes.get(code)}`)
  }
}

// Splits one CSV record. The master file quotes fields containing commas, so a
// plain split() silently corrupts the tail of those rows.
function splitCsv(line: string): string[] {
  const out: string[] = []
  let field = ""
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ",") {
      out.push(field)
      field = ""
    } else field += ch
  }
  out.push(field)
  return out
}

// The number the design hangs on: of the DIR rows that carry a CSLB licence
// number, how many actually resolve to a licence in the CSLB master file?
async function match(dirPath: string, masterPath: string) {
  const { createReadStream } = await import("node:fs")
  const { createInterface } = await import("node:readline")

  console.log(`indexing ${masterPath}…`)
  const licences = new Map<string, { name: string; status: string; classes: string }>()
  let header: string[] = []
  const rl = createInterface({ input: createReadStream(masterPath, { encoding: "utf8" }), crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line.trim()) continue
    const cols = splitCsv(line)
    if (!header.length) {
      header = cols
      continue
    }
    const col = (name: string) => cols[header.indexOf(name)] ?? ""
    // Licence numbers are compared as digits only — DIR stores them bare, but
    // leading zeros and stray spacing show up on both sides.
    const key = col("LicenseNo").replace(/\D/g, "").replace(/^0+/, "")
    if (key) {
      licences.set(key, {
        name: col("FullBusinessName") || col("BusinessName"),
        status: col("PrimaryStatus"),
        classes: col("Classifications(s)"),
      })
    }
  }
  console.log(`  ${licences.size.toLocaleString()} licences indexed`)

  console.log(`\nmatching ${dirPath}…`)
  let total = 0
  let withNumber = 0
  let matched = 0
  let matchedActive = 0
  const misses: string[] = []
  const classCounts = new Map<string, number>()

  const rl2 = createInterface({ input: createReadStream(dirPath, { encoding: "utf8" }), crlfDelay: Infinity })
  for await (const line of rl2) {
    if (!line.trim()) continue
    total++
    const row = JSON.parse(line) as Record<string, string>
    const key = (row.cslb ?? "").replace(/\D/g, "").replace(/^0+/, "")
    if (!key) continue
    withNumber++
    const hit = licences.get(key)
    if (!hit) {
      if (misses.length < 15) misses.push(`${row.cslb}  ${row.legal_name}`)
      continue
    }
    matched++
    if (/CLEAR|ACTIVE/i.test(hit.status)) matchedActive++
    for (const c of hit.classes.split(/[|,\s]+/).filter(Boolean)) {
      classCounts.set(c, (classCounts.get(c) ?? 0) + 1)
    }
  }

  const pct = (n: number, d: number) => (d ? ((n / d) * 100).toFixed(1) + "%" : "n/a")
  console.log(`\n== DIR x CSLB licence-number match ==`)
  console.log(`  DIR rows read                 ${total.toLocaleString()}`)
  console.log(`  ... carrying a CSLB number    ${withNumber.toLocaleString()}  (${pct(withNumber, total)} of rows read)`)
  console.log(`  ... resolving in CSLB master  ${matched.toLocaleString()}  (${pct(matched, withNumber)} of those)`)
  console.log(`  ... and currently clear/active ${matchedActive.toLocaleString()}  (${pct(matchedActive, withNumber)} of those)`)

  if (misses.length) {
    console.log(`\n  sample of unresolved numbers:`)
    for (const m of misses) console.log(`    ${m}`)
  }

  const top = [...classCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
  console.log(`\n  trade coverage of the matched set (top 25 of ${classCounts.size} codes seen):`)
  for (const [code, n] of top) console.log(`    ${code.padEnd(8)} ${String(n).padStart(6)}  ${pct(n, matched)}`)

  console.log(`\n  decision rule from the plan: >85% build as designed, 60-85% needs a`)
  console.log(`  name-matching fallback, <60% inverts to CSLB-primary.`)
}

// --- entry ------------------------------------------------------------------

const [command, ...rest] = process.argv.slice(2)
try {
  switch (command) {
    case "portal":
      await portal()
      break
    case "classifications":
      await classifications(rest[0])
      break
    case "master":
      await master(rest[0] ?? "MasterLicenseData.csv")
      break
    case "vocabulary":
      if (!rest[0]) throw new Error("vocabulary needs <master.csv> [classifications.json]")
      await vocabulary(rest[0], rest[1])
      break
    case "match":
      if (!rest[0] || !rest[1]) throw new Error("match needs <dir-sample.ndjson> <master.csv>")
      await match(rest[0], rest[1])
      break
    default:
      console.error(
        "usage: spike-cslb.ts <portal|classifications [out.json]|master [out.csv]|" +
          "vocabulary <master.csv> [classifications.json]|match <dir.ndjson> <master.csv>>",
      )
      process.exit(1)
  }
} catch (err) {
  console.error(`\nFAILED: ${(err as Error).message}`)
  process.exit(1)
}

export {}
