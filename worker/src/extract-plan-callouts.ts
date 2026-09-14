import Anthropic from "@anthropic-ai/sdk"

import type { RasterizedPage } from "./rasterize.js"
import type { ExtractedPlanCallout } from "./types.js"

// The sheet-by-sheet reconciliation matrix's extractor. extract.ts measures
// a quantity for the whole plan set; this reads the quantities the agency
// *printed* on each sheet — drainage and sign schedules, summary-of-
// quantities tables, general notes, profile callouts — and says which sheet
// each came from. Those are the numbers a contractor can quote back to the
// agency in an RFI ("Sheet C-301's schedule totals 655 LF; the bid form says
// 640"), which a measured number never is. Different job, different failure
// mode, so it's a separate call with its own prompt rather than extra
// fields on the takeoff.
//
// Same `||` rather than `??` as extract.ts, for the same reason: a
// declared-but-blank TAKEOFF_MODEL= line in .env is "" (not undefined).
const MODEL = process.env.TAKEOFF_MODEL || "claude-sonnet-5"

// Sheets go to Claude a few at a time, not the whole set at once as
// extract.ts does. The takeoff wants the whole set in view because a
// quantity spans plan + profile + detail; a callout belongs to exactly one
// sheet, and what matters is that the sheet number it's attributed to is
// the right one. Small batches keep the title block the model reads the
// number off within a page or two of the row it's transcribing.
export const PAGES_PER_CALL = 4

const SYSTEM_PROMPT = `You are transcribing quantities that are PRINTED on civil/roadway and site-work plan sheets (grading, paving, earthwork, utilities, traffic). You're shown a few sheets from a real plan set as images, in page order.

Your job is to read numbers the agency printed, not to measure, scale, or estimate anything. If a quantity is not written on the sheet, it does not exist for this task.

Where printed quantities live on plan sheets:
- Summary of quantities / earthwork summary tables (often on the title sheet or a "Q" sheet)
- Schedules: drainage/pipe schedules, sign schedules, striping schedules, structure schedules, tree removal schedules
- General notes that state a quantity ("Contractor shall remove approximately 1,200 CY of unsuitable material")
- Profile and plan callouts that state a length or count ("220 LF 18" RCP CL III", "INSTALL 3 EA TYPE G1 INLET")
- Detail sheets rarely state quantities — a dimension on a detail is NOT a quantity. Skip those.

For each sheet, first read its sheet number off the title block (e.g. "C-301", "SD-2", "Q-1"). If the sheet genuinely has none, use "Page N" with N being the PDF page number you were given.

For each quantity you find, extract:
- sheetNumber: as printed in the title block, exactly
- sheetTitle: the sheet's title from the title block, if legible
- pageNumber: the PDF page number of the sheet (from the list you were given)
- description: what the quantity is for, in the sheet's own words (e.g. "18\\" RCP Class III", "Type G1 Drainage Inlet")
- quantity: the number as printed. Strip thousands separators.
- unit: as printed (LF, EA, CY, SY, TON, SF, LS ...). Keep the sheet's spelling.
- sourceText: the verbatim text you read it from — the schedule row, the note, the callout. Required. A reviewer will look for this exact text on the sheet.
- sourceKind: one of "schedule", "summary", "note", "callout", "profile", "other"
- bidItemNumber: ONLY if you were given the official bid form's items below AND you are confident this quantity is for one of them, that item's number exactly as listed. Otherwise omit it. Do not guess — an unlinked row is fine, a wrongly linked row is not.
- confidence: 0-100, your confidence that you transcribed THIS number and attributed it to THIS sheet correctly. Be honest, not reassuring. A crisp digital table is 95-100. A scan you squinted at, a cut-off schedule, a number whose unit you inferred — well below that, and say why in notes.
- notes: anything a reviewer must check.

Rules:
- One row per (sheet, item). If one sheet lists several entries for the same item (three runs of 18" RCP in a drainage schedule), report ONE row for that sheet with their total, and put every entry in sourceText ("SD-1: 220 LF, SD-2: 185 LF, SD-3: 250 LF"). If the schedule prints its own total, use the printed total.
- If the same item appears on several sheets, report a row for each sheet. Do not add across sheets — the point is to see what each sheet says.
- Skip sheets that state no quantities. Most plan-view sheets are like that; an empty result for a sheet is correct, not a failure.
- Never invent a number, a unit, or a sheet number. If a value is partly illegible, report it with low confidence and say what was illegible.
- Do not report unit prices, dollar amounts, station numbers, elevations, or dimensions on details.

Call record_plan_callouts with everything you found.`

const TOOL = {
  name: "record_plan_callouts",
  description: "Record the quantities printed on these plan sheets, one row per sheet and item.",
  input_schema: {
    type: "object" as const,
    properties: {
      callouts: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            sheetNumber: { type: "string" as const },
            sheetTitle: { type: "string" as const },
            pageNumber: { type: "number" as const },
            description: { type: "string" as const },
            quantity: { type: "number" as const },
            unit: { type: "string" as const },
            sourceText: { type: "string" as const },
            sourceKind: {
              type: "string" as const,
              enum: ["schedule", "summary", "note", "callout", "profile", "other"],
            },
            bidItemNumber: { type: "string" as const },
            confidence: { type: "number" as const },
            notes: { type: "string" as const },
          },
          required: [
            "sheetNumber",
            "pageNumber",
            "description",
            "quantity",
            "unit",
            "sourceText",
            "sourceKind",
            "confidence",
          ],
        },
      },
    },
    required: ["callouts"],
  },
}

/**
 * The official bid form's items, as they were in `bid` when the plan set
 * was processed. Passed into the prompt so the model can link a callout to
 * an item number while it still has the sheet in front of it — far more
 * reliable than matching "18\" RCP" to "Reinforced Concrete Pipe, 18 inch"
 * on text afterwards. Empty when the bid form hasn't been imported yet;
 * the app-side matcher (lib/plan-callout-match.ts) then does what it can.
 */
export type BidItemHint = {
  itemNumber: string
  description: string
  unit: string
  quantity: number
}

export type PlanCalloutExtractResult = {
  callouts: ExtractedPlanCallout[]
  usage: { model: string; inputTokens: number; outputTokens: number }
}

export function batchPages<T>(pages: T[], size: number): T[][] {
  if (size < 1) throw new Error("batch size must be at least 1")
  const batches: T[][] = []
  for (let i = 0; i < pages.length; i += size) {
    batches.push(pages.slice(i, i + size))
  }
  return batches
}

function formatBidItems(bidItems: BidItemHint[]): string {
  if (bidItems.length === 0) return ""
  const lines = bidItems.map(
    (item) => `${item.itemNumber} | ${item.description} | ${item.unit} | ${item.quantity}`,
  )
  return `\n\nThe official bid form for this project lists these items (number | description | unit | official quantity). When a printed quantity is clearly for one of them, set bidItemNumber to that number exactly:\n${lines.join("\n")}`
}

async function extractBatch(
  client: Anthropic,
  pages: RasterizedPage[],
  bidItems: BidItemHint[],
): Promise<PlanCalloutExtractResult> {
  const imageBlocks = pages.map((page) => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: "image/png" as const,
      data: page.base64,
    },
  }))

  const response = await client.messages.create({
    model: MODEL,
    // A summary-of-quantities sheet alone can carry 60+ rows and each row
    // repeats its verbatim sourceText, so this needs the same headroom
    // extract-bid-form.ts gives a schedule — thinking shares the budget
    // with the tool call, and a tight limit truncates silently mid-table.
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "record_plan_callouts" },
    messages: [
      {
        role: "user",
        content: [
          ...imageBlocks,
          {
            type: "text",
            text: `Above are ${pages.length} sheets from a plan set, in order (PDF page numbers: ${pages
              .map((p) => p.pageNumber)
              .join(", ")}). Transcribe the printed quantities per the instructions.${formatBidItems(bidItems)}`,
          },
        ],
      },
    ],
  })

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  )
  if (!toolUse) {
    throw new Error("Claude didn't call record_plan_callouts — no structured output to parse.")
  }

  const input = toolUse.input as { callouts: ExtractedPlanCallout[] }
  return {
    callouts: input.callouts,
    usage: {
      model: MODEL,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  }
}

/**
 * Reads the printed quantities off every page, PAGES_PER_CALL sheets per
 * request, and returns them in page order with the usage summed across
 * requests so process-job.ts records it as one line of AI spend.
 */
export async function extractPlanCallouts(
  pages: RasterizedPage[],
  bidItems: BidItemHint[],
): Promise<PlanCalloutExtractResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set — see .env.example")
  }

  const client = new Anthropic({ apiKey })

  // Batches run concurrently: a 20-page set is five requests, and running
  // them one after another would make this the slowest step in the job by
  // a wide margin. Five parallel image requests is well inside the API's
  // concurrency limits.
  const results = await Promise.all(
    batchPages(pages, PAGES_PER_CALL).map((batch) => extractBatch(client, batch, bidItems)),
  )

  return {
    callouts: results.flatMap((result) => result.callouts),
    usage: {
      model: MODEL,
      inputTokens: results.reduce((sum, result) => sum + result.usage.inputTokens, 0),
      outputTokens: results.reduce((sum, result) => sum + result.usage.outputTokens, 0),
    },
  }
}
