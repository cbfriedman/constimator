import Anthropic from "@anthropic-ai/sdk"

import type { ExtractedQuoteCondition } from "./types.js"

// Step 41. The third extractor, and a different job again from the other
// two. extract.ts measures quantities off drawings; extract-bid-form.ts
// transcribes a printed schedule. This one reads prose — the sentences a sub
// attaches to their price — and classifies each into a fixed set of
// categories so the same condition lines up across every sub's quote.
//
// That difference drives the model choice. Reading a bid form is
// transcription, which Sonnet does well and cheaply; deciding whether "paving
// per plan, tie-ins by others" is an exclusion or a scope assumption is
// judgment, on documents that are frequently faxed, skewed, and handwritten.
// Same `||` rather than `??` as the other two extractors, for the same
// reason: a declared-but-blank QUOTE_MODEL= line in .env is "" (not
// undefined).
const MODEL = process.env.QUOTE_MODEL || "claude-opus-5"

// Must stay in sync by hand with quoteConditionCategoryEnum in db/schema.ts —
// the app validates against the enum when it materializes these rows, so a
// category invented here would be dropped there.
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
] as const

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
    type: "object" as const,
    properties: {
      conditions: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            category: { type: "string" as const, enum: [...CATEGORIES] },
            rawText: {
              type: "string" as const,
              description: "Verbatim text from the quote. Never paraphrased.",
            },
            normalizedValue: { type: "string" as const },
            sourcePage: { type: "number" as const },
            confidence: { type: "number" as const },
            flagReason: { type: "string" as const },
          },
          required: ["category", "rawText", "confidence"],
        },
      },
      quoteTotalAmount: {
        type: "number" as const,
        description:
          "The quote's stated bottom-line total, if one is printed. Omitted when the quote states no total.",
      },
      totalIsHandwritten: { type: "boolean" as const },
      documentNotes: {
        type: "string" as const,
        description:
          "Anything about the document as a whole a reviewer should know — including if this isn't a sub quote at all.",
      },
    },
    required: ["conditions"],
  },
}

export type QuoteConditionsExtractResult = {
  conditions: ExtractedQuoteCondition[]
  quoteTotalAmount?: number
  totalIsHandwritten?: boolean
  documentNotes?: string
  usage: { inputTokens: number; outputTokens: number }
}

const IMAGE_MEDIA_TYPES = ["image/jpeg", "image/png"] as const
type ImageMediaType = (typeof IMAGE_MEDIA_TYPES)[number]

function isImageMediaType(mimeType: string): mimeType is ImageMediaType {
  return (IMAGE_MEDIA_TYPES as readonly string[]).includes(mimeType)
}

/**
 * Builds the content block for the quote itself.
 *
 * A PDF goes to Claude as a document block rather than rasterized page images
 * (extract.ts's approach) for the same reason the bid-form extractor does it:
 * rasterizing throws away exact character data, and this extractor's whole
 * output is verbatim text. Scanned image-only PDFs still work — PDF support
 * handles both.
 *
 * A phone photo of a faxed quote arrives as a JPEG or PNG and goes as an
 * image block at its native resolution. Deliberately not downscaled: the
 * conditions worth catching are usually the ones in small print at the bottom
 * of a page that was already faxed once, and that is exactly the text that
 * disappears first when an image is resized.
 */
function buildSourceBlock(
  bytes: Buffer,
  mimeType: string,
): Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam {
  if (isImageMediaType(mimeType)) {
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: mimeType,
        data: bytes.toString("base64"),
      },
    }
  }

  return {
    type: "document",
    source: {
      type: "base64",
      media_type: "application/pdf",
      data: bytes.toString("base64"),
    },
  }
}

export async function extractQuoteConditions(
  bytes: Buffer,
  mimeType: string,
): Promise<QuoteConditionsExtractResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set — see .env.example")
  }

  const client = new Anthropic({ apiKey })

  // Streamed rather than a plain create(): every condition carries its own
  // verbatim quote, so a quote with a dense terms page produces a much larger
  // tool call than a bid schedule does, and a non-streaming request at this
  // max_tokens risks an SDK HTTP timeout that would look like a failed
  // extraction rather than a slow one.
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
          buildSourceBlock(bytes, mimeType),
          {
            type: "text",
            text: "Read this subcontractor quote and record its conditions per the instructions.",
          },
        ],
      },
    ],
  })

  const response = await stream.finalMessage()

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  )
  if (!toolUse) {
    throw new Error(
      "Claude didn't call record_quote_conditions — no structured output to parse.",
    )
  }

  const input = toolUse.input as {
    conditions: ExtractedQuoteCondition[]
    quoteTotalAmount?: number
    totalIsHandwritten?: boolean
    documentNotes?: string
  }

  return {
    // Dropped here rather than at materialization time: a condition with no
    // verbatim text can't be shown next to the original for review, so there
    // is no point carrying it any further. `strict` isn't set on the tool
    // (it's incompatible with the loose optional fields above), so this is
    // the check that actually enforces it.
    conditions: (input.conditions ?? []).filter(
      (condition) => condition.rawText?.trim(),
    ),
    quoteTotalAmount: input.quoteTotalAmount,
    totalIsHandwritten: input.totalIsHandwritten,
    documentNotes: input.documentNotes,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  }
}
