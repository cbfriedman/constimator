import Anthropic from "@anthropic-ai/sdk"

import type { ExtractedPlanHolder } from "./types.js"

// A plan holders list is the roster an agency publishes of everyone who
// pulled the bid documents. Like extract-bid-form.ts this is transcription,
// not estimation — every value is printed on the page and the job is to read
// it exactly. The failure mode is different though: a bid form is a table
// with named columns, while a plan holders roster is whatever the agency's
// clerk pasted together. Company, contact, address, phone and licence
// routinely share one cell, and the same agency's list changes shape between
// addenda. The prompt below is written around parsing, not reading.
//
// Same `||` rather than `??` as extract.ts and extract-bid-form.ts, for the
// same reason: a declared-but-blank TAKEOFF_MODEL= line in .env is "" (not
// undefined).
const MODEL = process.env.TAKEOFF_MODEL || "claude-sonnet-5"

// PDF document block rather than rasterized pages, matching
// extract-bid-form.ts: a plan holders list is nearly always a text PDF, and
// rasterizing throws away the exact character data — licence numbers and
// email addresses — that this extractor exists to read. Scanned lists still
// work, since PDF support handles both.
const SYSTEM_PROMPT = `You are transcribing a plan holders list published by a public agency for a construction project. A plan holders list (also called a planholder list, bidders list, or document holders list) names every company that obtained the bid documents.

Every value you report is printed on the document. Read it exactly. Do not estimate, infer, normalize, or complete anything.

For each company on the list, extract:
- rawText: the row exactly as printed, verbatim, including punctuation and line breaks within the row. This is what a human reviewer reads to check your parse, so it must be the unedited source text, never your cleaned-up version of it.
- companyName: the company's name as printed. Keep suffixes (Inc., LLC, Construction Co.) exactly as written. Do not expand abbreviations or re-title.
- contactName: the individual person named for that company, if one is printed.
- email, phone: as printed. Keep the document's formatting for phone numbers.
- address, city, state, postalCode: split only if the document makes the split unambiguous. If the address runs together in a way you would have to guess at, put the whole thing in address and leave the rest out. A wrong split is worse than an unsplit address.
- licenseNumber: the contractor licence number as printed, including any prefix the document shows ("Lic. 1044821", "C-12 1044821"). Do NOT strip the prefix and do NOT try to work out which part is the number — report what is printed.
- confidence: 0-100, your confidence in THIS row being parsed correctly. Be honest, not reassuring. A clean one-company-per-row table is 95-100. A row where fields ran together, a scan artifact, an ambiguous digit in a licence number, or a company name split across lines is well below that, and say why in notes.
- sourcePage: the PDF page the row came from.
- notes: anything a reviewer must check. Use this whenever you were not certain.

Also report:
- issuedOn: the date the agency printed on the roster, as ISO yyyy-mm-dd, if one is printed. Omit it if not — do not infer a date from anything else in the document.
- documentNotes: anything about the document as a whole a reviewer should know.

Rules:
- One entry per company. If the same company appears twice, report both rows and say so in notes — a duplicate on the agency's own list is a fact about the list.
- Do NOT include header rows, page furniture, the agency's own contact block, or instructions to bidders. You want the roster of companies, not the document around it.
- Never invent a company, an email, a phone number, or a licence number to make a row look complete. Omit a field you cannot read. A missing field is recoverable; a plausible wrong one is not.
- A blank field on the document is an omitted field here, not an empty string.
- If the document is not a plan holders list (it's a bid form, plan set, spec book, or something else), call record_plan_holders with an empty holders array and say so in documentNotes.

Call record_plan_holders with everything you found.`

const TOOL = {
  name: "record_plan_holders",
  description: "Record the companies transcribed from this plan holders list.",
  input_schema: {
    type: "object" as const,
    properties: {
      holders: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            rawText: { type: "string" as const },
            companyName: { type: "string" as const },
            contactName: { type: "string" as const },
            email: { type: "string" as const },
            phone: { type: "string" as const },
            address: { type: "string" as const },
            city: { type: "string" as const },
            state: { type: "string" as const },
            postalCode: { type: "string" as const },
            licenseNumber: { type: "string" as const },
            confidence: { type: "number" as const },
            sourcePage: { type: "number" as const },
            notes: { type: "string" as const },
          },
          required: ["rawText", "companyName", "confidence"],
        },
      },
      issuedOn: {
        type: "string" as const,
        description:
          "The date printed on the roster, ISO yyyy-mm-dd. Omit if the document doesn't print one.",
      },
      documentNotes: {
        type: "string" as const,
        description:
          "Anything about the document as a whole a reviewer should know — including if this isn't a plan holders list at all.",
      },
    },
    required: ["holders"],
  },
}

export type PlanHoldersExtractResult = {
  holders: ExtractedPlanHolder[]
  issuedOn?: string
  documentNotes?: string
  usage: { model: string; inputTokens: number; outputTokens: number }
}

export async function extractPlanHolders(
  pdfBytes: Buffer,
): Promise<PlanHoldersExtractResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set — see .env.example")
  }

  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: MODEL,
    // Higher than extract-bid-form.ts's budget on purpose. A bid schedule
    // runs 15-40 rows; a plan holders list on a sizable job runs to a couple
    // of hundred, each carrying a verbatim rawText as well as the parsed
    // fields. Thinking is on by default on the current models and shares
    // this budget with the tool call, so a tight limit truncates the roster
    // silently partway through rather than erroring.
    max_tokens: 32000,
    system: SYSTEM_PROMPT,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "record_plan_holders" },
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
            text: "Transcribe this plan holders list per the instructions.",
          },
        ],
      },
    ],
  })

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  )
  if (!toolUse) {
    throw new Error(
      "Claude didn't call record_plan_holders — no structured output to parse.",
    )
  }

  const input = toolUse.input as {
    holders: ExtractedPlanHolder[]
    issuedOn?: string
    documentNotes?: string
  }
  return {
    holders: input.holders,
    issuedOn: input.issuedOn,
    documentNotes: input.documentNotes,
    usage: {
      model: MODEL,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  }
}
