import Anthropic from "@anthropic-ai/sdk"

import type { ExtractedBidItem } from "./types.js"

// Step 40. The other extractor (extract.ts) measures quantities off plan
// sheets; this one transcribes the schedule of items off an official bid
// form, which is a different job with a different failure mode. There is a
// correct answer printed on the page, so the model's task is to read it
// exactly, not to estimate — the prompt below is written around that.
//
// Same `||` rather than `??` as extract.ts, for the same reason: a
// declared-but-blank TAKEOFF_MODEL= line in .env is "" (not undefined).
const MODEL = process.env.TAKEOFF_MODEL || "claude-sonnet-5"

// The bid form goes to Claude as a PDF document block, not as rasterized
// page images (extract.ts's approach). A bid form is a text PDF far more
// often than a plan sheet is, and rasterizing throws away the exact
// character data this extractor exists to read. Scanned/image-only bid
// forms still work — PDF support handles both — so this is strictly better
// here, while plan sheets keep the image path where the drawing itself is
// the content.
const SYSTEM_PROMPT = `You are transcribing the schedule of bid items from an official construction bid form (a civil/roadway or site-work project's bid schedule, proposal form, or schedule of values).

Every value you report is printed on the form. Your job is to read it exactly, not to estimate, infer, or compute it.

For each bid item listed on the form, extract:
- itemNumber: the item/line number exactly as printed (e.g. "1", "A-4", "12.1"). If the form doesn't number its items, use the item's 1-based position in the schedule.
- description: the item description as printed. Keep the agency's wording — do not normalize, expand abbreviations, or re-title it.
- unit: the unit of measure as printed (LS, CY, TON, SY, LF, EA, SF, ...). Keep the form's spelling and case as-is; if it prints "L.S." report "L.S.".
- quantity: the estimated/official quantity as printed, as a number. Strip thousands separators. If the quantity column is blank or shows a dash for a lump-sum item, report 1.
- specSection: the spec/standard-specification section reference if the form prints one, otherwise omit.
- confidence: 0-100, your confidence in THIS row being transcribed correctly. Be honest, not reassuring. A crisp digital table is 95-100. Anything you had to squint at — a scan artifact, an ambiguous digit, a description running across a line break, a merged or unclear cell — is well below that, and say why in notes.
- sourcePage: the PDF page the row came from.
- notes: anything a human reviewer must check. Use this whenever you were not certain.

Rules:
- Transcribe every row in the schedule, in the order printed, including alternates and additive/deductive bid items. Note in that item's notes when a row is an alternate rather than base bid.
- Do NOT include the bid form's total/subtotal rows, header rows, signature blocks, or unit-price and extended-amount columns the bidder is meant to fill in. You want the item schedule the agency published, not the bidder's pricing.
- Never invent a row, a number, or a unit to make the schedule look complete. If a row is present but partly illegible, report it with low confidence and say what was illegible.
- If the document is not a bid form (it's a plan set, spec book, addendum, or something else), call record_bid_form with an empty items array and say so in documentNotes.

Call record_bid_form with everything you found.`

const TOOL = {
  name: "record_bid_form",
  description: "Record the line items transcribed from this official bid form.",
  input_schema: {
    type: "object" as const,
    properties: {
      items: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            itemNumber: { type: "string" as const },
            description: { type: "string" as const },
            unit: { type: "string" as const },
            quantity: { type: "number" as const },
            specSection: { type: "string" as const },
            confidence: { type: "number" as const },
            sourcePage: { type: "number" as const },
            notes: { type: "string" as const },
          },
          required: ["itemNumber", "description", "unit", "quantity", "confidence"],
        },
      },
      documentNotes: {
        type: "string" as const,
        description:
          "Anything about the document as a whole a reviewer should know — including if this isn't a bid form at all.",
      },
    },
    required: ["items"],
  },
}

export type BidFormExtractResult = {
  items: ExtractedBidItem[]
  documentNotes?: string
  usage: { model: string; inputTokens: number; outputTokens: number }
}

export async function extractBidForm(pdfBytes: Buffer): Promise<BidFormExtractResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set — see .env.example")
  }

  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: MODEL,
    // Generous relative to the ~15-40 rows a bid schedule actually holds:
    // thinking is on by default on the current models and shares this
    // budget with the tool call, so a tight limit here truncates the
    // schedule silently in the middle rather than erroring.
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "record_bid_form" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBytes.toString("base64"),
            },
          },
          {
            type: "text",
            text: "Transcribe this bid form's schedule of items per the instructions.",
          },
        ],
      },
    ],
  })

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  )
  if (!toolUse) {
    throw new Error("Claude didn't call record_bid_form — no structured output to parse.")
  }

  const input = toolUse.input as { items: ExtractedBidItem[]; documentNotes?: string }
  return {
    items: input.items,
    documentNotes: input.documentNotes,
    usage: {
      model: MODEL,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  }
}
