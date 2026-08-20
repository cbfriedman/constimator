import Anthropic from "@anthropic-ai/sdk"

import type { RasterizedPage } from "./rasterize.js"
import type { ExtractedTakeoffItem } from "./types.js"

// Same prompt/tool schema validated by scripts/takeoff-validation (step 15)
// — this is that script's approach wired into the real pipeline, not a
// fresh design. Keep the two in sync if the prompt is ever tuned.
// `?? "claude-sonnet-5"` looks right but isn't: a declared-but-blank
// TAKEOFF_MODEL= line in .env makes process.env.TAKEOFF_MODEL "" (not
// undefined), which ?? treats as already-set — found live during the step
// 36 load test via the identical bug in index.ts's POLL_INTERVAL_MS.
const MODEL = process.env.TAKEOFF_MODEL || "claude-sonnet-5"

const SYSTEM_PROMPT = `You are doing a construction quantity takeoff from civil/roadway and site-work plan sheets (grading, paving, earthwork, utilities — the trades a civil site contractor bids). You're shown every sheet of a real plan set as images, in page order.

For each distinct bid item you can identify, extract:
- trade: the trade/category (e.g. "Grading", "Paving", "Storm Drain", "Water/Sewer", "Traffic Control")
- description: a short, specific description of the item (e.g. "18\\" RCP Class III")
- quantity: your best measured/counted quantity
- unit: the unit (CY, TON, SY, LF, EA, LS, etc.)
- confidence: your own confidence in this specific number, 0-100 — be honest, not reassuring. If a dimension is illegible, a schedule is cut off, or you're inferring from an ambiguous callout, say so with a low number.
- sourceSheets: which sheet(s) you took this from
- notes: anything a human reviewer should double-check

Call record_takeoff with everything you found. Do not skip items because you're unsure — report them with low confidence instead. Do not average or hedge toward round numbers.`

const TOOL = {
  name: "record_takeoff",
  description: "Record the quantities extracted from this plan set.",
  input_schema: {
    type: "object" as const,
    properties: {
      items: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            trade: { type: "string" as const },
            description: { type: "string" as const },
            quantity: { type: "number" as const },
            unit: { type: "string" as const },
            confidence: { type: "number" as const },
            sourceSheets: { type: "string" as const },
            notes: { type: "string" as const },
          },
          required: ["trade", "description", "quantity", "unit", "confidence"],
        },
      },
    },
    required: ["items"],
  },
}

export type ExtractResult = {
  items: ExtractedTakeoffItem[]
  usage: { model: string; inputTokens: number; outputTokens: number }
}

export async function extractQuantities(pages: RasterizedPage[]): Promise<ExtractResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set — see .env.example")
  }

  const client = new Anthropic({ apiKey })

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
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "record_takeoff" },
    messages: [
      {
        role: "user",
        content: [
          ...imageBlocks,
          {
            type: "text",
            text: `Above are ${pages.length} sheets from a plan set, in order (page numbers: ${pages.map((p) => p.pageNumber).join(", ")}). Extract quantities per the instructions.`,
          },
        ],
      },
    ],
  })

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  )
  if (!toolUse) {
    throw new Error("Claude didn't call record_takeoff — no structured output to parse.")
  }

  const input = toolUse.input as { items: ExtractedTakeoffItem[] }
  return {
    items: input.items,
    usage: {
      model: MODEL,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  }
}
