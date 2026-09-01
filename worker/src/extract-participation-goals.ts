import Anthropic from "@anthropic-ai/sdk"

import type { ExtractedParticipationGoal, ExtractedSpecLink } from "./types.js"

// Reads the disadvantaged-business participation requirement out of a
// project's specifications. Like extract-bid-form.ts and
// extract-plan-holders.ts this is transcription, not estimation — the goal is
// printed in the special provisions and the job is to read it exactly.
//
// The failure mode this prompt is written around is different from the other
// extractors', and it is why this is a separate extractor rather than a
// question bolted onto the takeoff. A model asked "what is the DBE goal" on a
// spec book that doesn't state one will supply the number the agency usually
// uses, because that number is genuinely in its training data and it reads as
// helpful. A bid priced against a goal the specs never set is worse than no
// answer, so "these specs set no goal" has to be as reportable an outcome as
// a percentage — hence the empty-array instruction below, repeated in the
// tool description.
//
// Same `||` rather than `??` as the other extractors, for the same reason: a
// declared-but-blank TAKEOFF_MODEL= line in .env is "" (not undefined).
const MODEL = process.env.TAKEOFF_MODEL || "claude-sonnet-5"

// A PDF document block, not rasterized pages, for the same reason as
// extract-bid-form.ts: the answers here are printed characters — a percentage
// and a URL — and rasterizing throws away exactly the data this extractor
// exists to read. A mistyped digit in a URL makes the link useless in a way a
// slightly-off quantity never is.
//
// The API accepts a base64 PDF block up to 32MB. A full spec book can exceed
// that, so the check below fails the job with something a person can act on
// rather than letting the request come back with an API-shaped 400. It's a
// size check rather than a page check because nothing populates
// document.page_count yet, and parsing the PDF just to count pages costs more
// than it is worth when the byte length is already in hand.
const MAX_PDF_BYTES = 32 * 1024 * 1024

const SYSTEM_PROMPT = `You are reading the disadvantaged-business participation requirement out of a public agency's project specifications for a construction project — the special provisions, notice to bidders, or instructions to bidders.

Every value you report is printed in this document. Read it exactly. Do not estimate, infer, normalize, or complete anything. In particular, do not report what an agency's participation goal usually is, or what a programme's typical percentage is — only what this document prints.

A participation requirement names a certification programme and, usually, a percentage of the contract that must go to firms holding that certification. These programmes are NOT interchangeable — report the one this document actually names:
- DBE — Disadvantaged Business Enterprise (federal-aid work, certified through the California Unified Certification Program)
- DVBE — Disabled Veteran Business Enterprise (California state programme)
- SB / SBE — Small Business / Small Business Enterprise
- MBE / WBE — Minority / Women Business Enterprise
- LBE — Local Business Enterprise (individual city and county programmes)
- Any other programme the document names — report the abbreviation as printed.

For each participation requirement this project imposes, extract:
- rawText: the sentence or sentences stating the requirement, verbatim, exactly as printed. This is what a human reviewer reads to check you, so it must be the unedited source text, never your summary of it.
- program: the programme abbreviation as the document uses it ("DBE", "DVBE", "LBE"). If the document spells the programme out and never abbreviates it, report the spelled-out name as printed.
- goalPercent: the percentage as a number — 18.5 for "18.5%", 7 for "seven percent". Omit this field entirely if the document states a requirement but no percentage (a race-neutral goal, "no goal has been established for this project", a good-faith-effort-only requirement, or a goal expressed as a dollar amount), and say which of those it is in notes.
- appliesTo: what the percentage is taken of, as printed — "of the total contract amount", "of the federal-aid portion of the contract". Omit if the document doesn't say.
- confidence: 0-100, your confidence in THIS requirement being read correctly. Be honest, not reassuring. A goal stated once in a clear numbered section is 95-100. A percentage you had to work out from surrounding text, a document that states the goal more than once with different numbers, or an ambiguous digit is well below that, and say why in notes.
- sourcePage: the PDF page the requirement came from.
- notes: anything a reviewer must check. Use this whenever you were not certain.

Also report:
- links: every web address the document prints in connection with these requirements — where the directory of certified firms is searched, where the required forms or the bid documents are obtained, or where the programme's rules are published. For each link report: url exactly as printed; label saying what the document says that address is for, in the document's own words; and sourcePage.
- documentNotes: anything about the document as a whole a reviewer should know.

Rules:
- Report only requirements imposed on THIS project. A clause quoting a statute is still this project's requirement if that is what the project imposes; a passage describing another agency's programme, or an example, is not.
- If this document sets no participation requirement at all, call record_participation_goals with an empty goals array and say so in documentNotes. That is a real and useful answer. Never supply a goal the document does not state, never carry a percentage over from a different programme, and never fill in a number from your own knowledge of what an agency normally requires.
- Report each distinct programme once. If the document states goals for two programmes (a DBE goal and a DVBE goal, say), that is two entries.
- Never invent, correct, complete, or guess at a URL. Report only web addresses actually printed in the document, character for character. If a printed address is broken across a line, join it and say so in that link's label.
- A blank or absent field is an omitted field here, not an empty string.
- If this document is not a specification or provisions document (it's a plan set, a bid form, a plan holders list, or something else), call record_participation_goals with an empty goals array and say so in documentNotes.

Call record_participation_goals with everything you found.`

const TOOL = {
  name: "record_participation_goals",
  description:
    "Record the participation requirements printed in these specifications, and the web addresses the specifications print alongside them. Call this with an empty goals array when the document sets no participation requirement — for such a document that is the correct answer, not a failure.",
  input_schema: {
    type: "object" as const,
    properties: {
      goals: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            rawText: { type: "string" as const },
            program: { type: "string" as const },
            goalPercent: { type: "number" as const },
            appliesTo: { type: "string" as const },
            confidence: { type: "number" as const },
            sourcePage: { type: "number" as const },
            notes: { type: "string" as const },
          },
          required: ["rawText", "program", "confidence"],
        },
      },
      links: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            url: { type: "string" as const },
            label: { type: "string" as const },
            sourcePage: { type: "number" as const },
          },
          required: ["url", "label"],
        },
      },
      documentNotes: {
        type: "string" as const,
        description:
          "Anything about the document as a whole a reviewer should know — including that it sets no participation requirement, or that it isn't a specifications document at all.",
      },
    },
    required: ["goals"],
  },
}

export type ParticipationGoalsExtractResult = {
  goals: ExtractedParticipationGoal[]
  links: ExtractedSpecLink[]
  documentNotes?: string
  usage: { model: string; inputTokens: number; outputTokens: number }
}

export async function extractParticipationGoals(
  pdfBytes: Buffer,
): Promise<ParticipationGoalsExtractResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set — see .env.example")
  }

  if (pdfBytes.byteLength > MAX_PDF_BYTES) {
    const sizeMb = (pdfBytes.byteLength / 1024 / 1024).toFixed(1)
    throw new Error(
      `This specifications file is ${sizeMb} MB — too large to read in one pass (the limit is 32 MB). Upload just the section carrying the participation requirement — the notice to bidders or the special provisions — and the goal will be read from that.`,
    )
  }

  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: MODEL,
    // Smaller than the other extractors' budgets on purpose, and for the
    // opposite reason: this one returns a handful of entries however long the
    // spec book is, so there's no roster to truncate partway through. Still
    // generous, because thinking is on by default on the current models and
    // shares this budget with the tool call.
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "record_participation_goals" },
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
            text: "Read the participation requirement out of these specifications per the instructions.",
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
      "Claude didn't call record_participation_goals — no structured output to parse.",
    )
  }

  const input = toolUse.input as {
    goals: ExtractedParticipationGoal[]
    links?: ExtractedSpecLink[]
    documentNotes?: string
  }
  return {
    goals: input.goals,
    links: input.links ?? [],
    documentNotes: input.documentNotes,
    usage: {
      model: MODEL,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  }
}
