/**
 * Standalone accuracy harness for sub-quote condition extraction.
 * Calls the same Claude path the worker uses (document PDF → conditions),
 * without needing the full Next.js upload UI.
 *
 * Usage (from repo root):
 *   node --env-file=.env.local scripts/real-job/run-sub-quote-samples.mjs
 *
 * Requires ANTHROPIC_API_KEY in the environment (worker/.env or .env.local).
 * Writes JSON reports under scripts/real-job/reports/.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "../..")
const require = createRequire(join(root, "worker/package.json"))

// Prefer worker's Anthropic SDK once installed.
let Anthropic
try {
  Anthropic = require("@anthropic-ai/sdk").default
} catch {
  console.error(
    "Install worker deps first: cd worker && npm install\n" +
      "Then set ANTHROPIC_API_KEY and re-run.",
  )
  process.exit(1)
}

const MODEL = process.env.QUOTE_MODEL || "claude-opus-5"

const CATEGORIES = [
  "exclusion",
  "inclusion",
  "mobilization",
  "pricing_basis",
  "minimum_charge",
  "quantity_assumption",
  "price_validity",
  "bond",
  "tax",
  "prevailing_wage",
  "traffic_control",
  "work_hours",
  "material_supply",
  "disposal",
  "site_access",
  "weather",
  "insurance",
  "retainage",
  "other",
]

const SYSTEM_PROMPT = `You are reading a subcontractor's price quote sent to a general contractor bidding a civil/roadway or site-work project. Your job is to find the conditions the sub has attached to their price — the terms that decide what the number actually buys.

This matters because the low quote is usually low for a reason. A sub who excluded traffic control, carried one mobilization on a four-phase job, or priced off quantities that don't match the plans is cheaper than one who didn't, and the prime needs to see exactly that before comparing prices.

For each condition you find, record:
- category: one of ${CATEGORIES.join(", ")}.
- rawText: the exact words from the quote that state this condition, copied verbatim. Never paraphrase, correct, complete, or clean up this text — it is shown to a human next to the original document so they can confirm your reading at a glance, and it is worthless if it doesn't match what is on the page. If the wording is split across a line break, join it with a single space and nothing else.
- normalizedValue: the same condition restated so it can be compared against other subs' quotes (e.g. "2 mobilizations included, $1,850 per additional"; "excluded"; "price firm 30 days"). Omit when the condition doesn't reduce to anything more useful than its own wording.
- sourcePage: the page the condition appears on.
- confidence: 0-100 for THIS condition — both that you read the words correctly and that you categorized it correctly. Be honest, not reassuring. Crisp typed text you understood fully is 95-100. Anything you had to interpret — faded fax, handwriting, an ambiguous phrase, a term that could fit two categories — is well below that.
- flagReason: why a human should look at this one first. Set it whenever you were unsure of the reading, the wording is ambiguous, the condition is handwritten, or a number in it could be misread. Omit only when you are genuinely confident.

Category guidance:
- exclusion: work or cost the sub states they are NOT covering.
- inclusion: work the sub explicitly states they ARE covering. Only record this where the quote calls it out; do not list every item they priced.
- mobilization: how many mobilizations are included, and the cost of an additional one. Record this whenever mobilization is mentioned at all — on phased work an unstated extra mob is money the prime absorbs.
- pricing_basis: unit price vs lump sum, and any escalation tied to quantity.
- minimum_charge: a minimum quantity, minimum dollar amount, or minimum day rate.
- quantity_assumption: quantities or dimensions the price is based on.
- price_validity: how long the price is good for; escalation or re-pricing clauses.
- bond / tax / insurance / retainage: whether each is included, excluded, or added, and at what rate.
- prevailing_wage: prevailing wage, Davis-Bacon, union rates, certified payroll.
- traffic_control: traffic control, flagging, detours, MOT — included, excluded, or by others.
- work_hours: night work, weekend work, shift restrictions, allowed working windows.
- material_supply: who furnishes which materials.
- disposal: spoils, haul-off, import/export, and who takes ownership.
- site_access: assumptions about access, staging, laydown, or existing site conditions.
- weather: weather-day assumptions or standby terms.
- other: a real condition that fits none of the above. Use it sparingly.

Rules:
- Record ONLY conditions the quote actually states. This is the rule that matters most. A quote that never mentions traffic control has NOT excluded traffic control — it has said nothing about it, and those are different facts a human will act on differently. If it isn't on the page, there is no condition, so record nothing. Never fill a category just because it is in the list above.
- Read the whole document, including fine print, footers, headers, terms on the back page, and anything handwritten in a margin. Conditions hide there far more often than in the body.
- Handwritten conditions count and should be recorded — set flagReason to say the text is handwritten, and lower confidence accordingly.
- One condition per entry. If a sentence states three exclusions, record three entries, each quoting the part of the sentence that applies to it.
- Do not record the same condition twice because it appears in two places. Record it once, quoting the clearer statement.
- Report the quote's bottom-line total in quoteTotalAmount if one is printed, and set totalIsHandwritten when that figure is handwritten. Omit quoteTotalAmount entirely if no total is stated — do not add up line items yourself.
- If the document is not a subcontractor quote at all (it's a plan set, a bid form, an invoice, a letter), call record_quote_conditions with an empty conditions array and say so in documentNotes.

Call record_quote_conditions with everything you found.`

const TOOL = {
  name: "record_quote_conditions",
  description:
    "Record the conditions, and the bottom-line total, read off this subcontractor quote.",
  input_schema: {
    type: "object",
    properties: {
      conditions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: { type: "string", enum: CATEGORIES },
            rawText: { type: "string" },
            normalizedValue: { type: "string" },
            sourcePage: { type: "number" },
            confidence: { type: "number" },
            flagReason: { type: "string" },
          },
          required: ["category", "rawText", "confidence"],
        },
      },
      quoteTotalAmount: { type: "number" },
      totalIsHandwritten: { type: "boolean" },
      documentNotes: { type: "string" },
    },
    required: ["conditions"],
  },
}

const SAMPLES = [
  {
    id: "clean-electrical",
    label: "Clean typed PDF (Phoenix Electric)",
    path: join(
      process.env.TEMP || "/tmp",
      "drive-jobs/pdfs/grand-electrical.pdf",
    ),
    expectedTotal: 871500,
    mustFind: [
      "traffic control",
      "by others",
      "871,500",
      "addendum",
    ],
  },
  {
    id: "messy-fax",
    label: "Fax/scan (Devil Mountain)",
    path: join(process.env.TEMP || "/tmp", "drive-jobs/pdfs/grand-fax.pdf"),
    expectedTotal: null,
    mustFind: [],
    expectHard: true,
  },
  {
    id: "messy-trucking",
    label: "Rate sheet with blanks (Golden Gate trucking)",
    path: join(
      process.env.TEMP || "/tmp",
      "drive-jobs/pdfs/grand-trucking.pdf",
    ),
    expectedTotal: null,
    mustFind: ["prevailing", "90 days", "standby"],
  },
]

async function extract(bytes) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local or worker/.env and re-run.",
    )
  }

  const client = new Anthropic({ apiKey })
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    system: SYSTEM_PROMPT,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "record_quote_conditions" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: bytes.toString("base64"),
            },
          },
          {
            type: "text",
            text: "Read this subcontractor quote and record its conditions per the instructions.",
          },
        ],
      },
    ],
  })

  const response = await stream.finalMessage()
  const toolUse = response.content.find((b) => b.type === "tool_use")
  if (!toolUse) throw new Error("No tool_use in response")

  const input = toolUse.input
  return {
    conditions: (input.conditions ?? []).filter((c) => c.rawText?.trim()),
    quoteTotalAmount: input.quoteTotalAmount,
    totalIsHandwritten: input.totalIsHandwritten,
    documentNotes: input.documentNotes,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  }
}

function score(sample, result) {
  const blob = JSON.stringify(result).toLowerCase()
  const hits = sample.mustFind.filter((k) =>
    blob.includes(k.toLowerCase().replace(/,/g, "")),
  )
  // Also try with commas for money strings
  const hits2 = sample.mustFind.filter((k) => blob.includes(k.toLowerCase()))
  const found = [...new Set([...hits, ...hits2])]

  let totalOk = null
  if (sample.expectedTotal != null) {
    totalOk = result.quoteTotalAmount === sample.expectedTotal
  }

  const flagged = (result.conditions || []).filter((c) => c.flagReason).length
  const lowConf = (result.conditions || []).filter(
    (c) => (c.confidence ?? 100) < 80,
  ).length

  return {
    totalOk,
    expectedTotal: sample.expectedTotal,
    gotTotal: result.quoteTotalAmount ?? null,
    mustFind: sample.mustFind,
    found,
    missed: sample.mustFind.filter((k) => !found.includes(k)),
    conditionCount: result.conditions?.length ?? 0,
    flagged,
    lowConf,
    expectHard: !!sample.expectHard,
  }
}

async function main() {
  const reportsDir = join(__dirname, "reports")
  await mkdir(reportsDir, { recursive: true })

  const summary = []

  for (const sample of SAMPLES) {
    console.log(`\n=== ${sample.label} ===`)
    console.log(`File: ${sample.path}`)
    const bytes = await readFile(sample.path)
    const started = Date.now()
    let result
    try {
      result = await extract(bytes)
    } catch (err) {
      console.error(`FAILED: ${err.message}`)
      summary.push({
        id: sample.id,
        label: sample.label,
        error: err.message,
      })
      continue
    }
    const elapsedMs = Date.now() - started
    const scored = score(sample, result)
    console.log(
      `Total: expected=${scored.expectedTotal} got=${scored.gotTotal} ok=${scored.totalOk}`,
    )
    console.log(
      `Conditions: ${scored.conditionCount} (flagged=${scored.flagged}, lowConf=${scored.lowConf})`,
    )
    console.log(`Must-find hits: ${scored.found.join(", ") || "(none)"}`)
    if (scored.missed.length) console.log(`Missed: ${scored.missed.join(", ")}`)
    if (result.documentNotes) console.log(`Notes: ${result.documentNotes}`)

    const out = {
      sample,
      scored,
      elapsedMs,
      result,
    }
    const outPath = join(reportsDir, `${sample.id}.json`)
    await writeFile(outPath, JSON.stringify(out, null, 2))
    console.log(`Wrote ${outPath}`)
    summary.push({
      id: sample.id,
      label: sample.label,
      scored,
      elapsedMs,
      documentNotes: result.documentNotes,
    })
  }

  const summaryPath = join(reportsDir, "sub-quote-scorecard.json")
  await writeFile(summaryPath, JSON.stringify(summary, null, 2))
  console.log(`\nScorecard: ${summaryPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
