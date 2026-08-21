// Risk flagging for extracted sub-quote conditions (Phase 3 review UI).
//
// The governing constraint here is "only flag what's actually risky — if
// everything is flagged, nothing is." A flag is a claim on an estimator's
// attention during bid week, and a list where every row is red is one nobody
// reads. So this module is deliberately stingy: strict thresholds, and an
// explicit noise guard that discards the model's own subjective flagging when
// it stops discriminating between rows.
//
// Note the asymmetry in that guard: the *objective* signals (a confidence
// number, handwriting, a quantity that contradicts the bid form) are never
// suppressed no matter how many rows carry them, because when those fire on
// everything the honest answer really is "this whole document is a problem."
// Only the model's free-text flagReason — the subjective one — gets muted.

export type FlagKind =
  | "low_confidence"
  | "handwritten"
  | "quantity_mismatch"
  | "extractor_note"

export type ConditionFlag = {
  kind: FlagKind
  /** Short chip text. */
  label: string
  /** One sentence saying what specifically is risky. Shown on the row. */
  detail: string
  /** 3 = look at this first. Used for ordering, not for colour. */
  severity: 1 | 2 | 3
}

/**
 * Below this, the model told us it wasn't sure. Set well under a "not
 * perfect" score: the extractor is instructed to score crisp typed text it
 * fully understood at 95-100, so 70 means genuine doubt rather than ordinary
 * imprecision. Raising this would flag most of a clean document.
 */
export const LOW_CONFIDENCE_THRESHOLD = 70

/** Below this it isn't "check this", it's "the model couldn't read it". */
const VERY_LOW_CONFIDENCE_THRESHOLD = 50

/**
 * If the model's own flagReason lands on more than this share of a quote's
 * conditions, it has stopped being a signal — a fax that's uniformly hard to
 * read produces a note on every row, which tells an estimator nothing about
 * where to look. Past this ratio the notes are dropped and only the objective
 * flags remain.
 */
const EXTRACTOR_NOTE_NOISE_RATIO = 0.8

/** A quote and a bid form rarely agree to the cent; this is the point where a difference is a real discrepancy rather than rounding. */
const QUANTITY_TOLERANCE_RATIO = 0.01

const HANDWRITING_PATTERN = /hand[\s-]?writ/i

export type ReviewableCondition = {
  id: string
  category: string
  rawText: string
  normalizedValue: string | null
  sourcePage: number | null
  boundingBox: [number, number, number, number] | null
  /** 0-100, or null when the extractor gave none. */
  confidence: number | null
  flagReason: string | null
  isConfirmed: boolean
}

/** The subset of a bid-form line this module compares against. */
export type BidQuantity = {
  itemNumber: string
  unit: string
  officialQuantity: number
}

export type FlaggedCondition = ReviewableCondition & {
  flags: ConditionFlag[]
  /** Highest severity among flags, or 0 when unflagged. Ordering key. */
  riskScore: number
}

// ---------------------------------------------------------------------------
// Quantity parsing
// ---------------------------------------------------------------------------

/**
 * Pulls a quantity + unit out of a condition's text, e.g. "Price based on
 * 1,200 TON of AC" -> { value: 1200, unit: "TON" }.
 *
 * Returns null on anything ambiguous rather than guessing. A wrong quantity
 * comparison produces a confident, specific, wrong flag — which is worse for
 * trust than no flag at all, since the estimator would have to re-derive the
 * real numbers to discover the tool was mistaken.
 */
export function parseQuantity(text: string): { value: number; unit: string } | null {
  // Number (with optional thousands separators / decimal) followed by a short
  // alphabetic unit token. Requires the unit to immediately follow the number.
  const match = text.match(/(\d[\d,]*(?:\.\d+)?)\s*([A-Za-z]{1,6})\b/)
  if (!match) return null

  const value = Number(match[1].replace(/,/g, ""))
  if (!Number.isFinite(value) || value <= 0) return null

  const unit = match[2].toUpperCase()
  // Words that look like units to the regex but never are. Without this,
  // "valid for 30 days" parses as 30 DAYS and gets compared to the bid form.
  const NON_UNITS = new Set([
    "DAY", "DAYS", "WEEK", "WEEKS", "MONTH", "MONTHS", "YEAR", "YEARS",
    "HR", "HRS", "HOUR", "HOURS", "AM", "PM", "PCT", "OF", "AND", "PER",
  ])
  if (NON_UNITS.has(unit)) return null

  return { value, unit }
}

function quantityMismatch(
  condition: ReviewableCondition,
  bidQuantities: BidQuantity[],
): ConditionFlag | null {
  // Only quantity assumptions make a claim the bid form can contradict. A
  // pricing basis or an exclusion that happens to contain a number isn't
  // asserting a takeoff quantity, and comparing it would be noise.
  if (condition.category !== "quantity_assumption") return null
  if (bidQuantities.length === 0) return null

  const parsed = parseQuantity(condition.normalizedValue ?? condition.rawText)
  if (!parsed) return null

  const sameUnit = bidQuantities.filter((bid) => bid.unit.toUpperCase() === parsed.unit)
  if (sameUnit.length === 0) return null

  const matches = (bid: BidQuantity) => {
    const tolerance = Math.abs(bid.officialQuantity) * QUANTITY_TOLERANCE_RATIO
    return Math.abs(bid.officialQuantity - parsed.value) <= tolerance
  }

  // Agreeing with any bid line of that unit is agreement — a sub quoting one
  // of several same-unit items shouldn't be flagged for not matching the
  // others.
  if (sameUnit.some(matches)) return null

  const closest = sameUnit.reduce((best, bid) =>
    Math.abs(bid.officialQuantity - parsed.value) < Math.abs(best.officialQuantity - parsed.value)
      ? bid
      : best,
  )

  return {
    kind: "quantity_mismatch",
    label: "Quantity mismatch",
    detail: `Quote assumes ${parsed.value.toLocaleString("en-US")} ${parsed.unit}; bid item ${closest.itemNumber} shows ${closest.officialQuantity.toLocaleString("en-US")} ${closest.unit}.`,
    severity: 3,
  }
}

// ---------------------------------------------------------------------------
// Flagging
// ---------------------------------------------------------------------------

function objectiveFlags(
  condition: ReviewableCondition,
  bidQuantities: BidQuantity[],
): ConditionFlag[] {
  const flags: ConditionFlag[] = []

  if (condition.flagReason && HANDWRITING_PATTERN.test(condition.flagReason)) {
    flags.push({
      kind: "handwritten",
      label: "Handwritten",
      detail: "Read from handwriting on the quote — confirm the wording against the original.",
      severity: 3,
    })
  }

  if (condition.confidence != null && condition.confidence < LOW_CONFIDENCE_THRESHOLD) {
    flags.push({
      kind: "low_confidence",
      label: "Low confidence",
      detail:
        condition.confidence < VERY_LOW_CONFIDENCE_THRESHOLD
          ? `The extractor could barely read this (${Math.round(condition.confidence)}% confident).`
          : `The extractor was unsure of this reading (${Math.round(condition.confidence)}% confident).`,
      severity: condition.confidence < VERY_LOW_CONFIDENCE_THRESHOLD ? 3 : 2,
    })
  }

  const mismatch = quantityMismatch(condition, bidQuantities)
  if (mismatch) flags.push(mismatch)

  return flags
}

/** The model's free-text reason, when it isn't already covered by an objective flag. */
function extractorNote(condition: ReviewableCondition, alreadyFlagged: ConditionFlag[]): ConditionFlag | null {
  const reason = condition.flagReason?.trim()
  if (!reason) return null
  // Handwriting is already reported as its own, stronger flag.
  if (alreadyFlagged.some((flag) => flag.kind === "handwritten")) return null

  return {
    kind: "extractor_note",
    label: "Needs a look",
    detail: reason,
    severity: 1,
  }
}

/**
 * Attaches flags to every condition and orders them so the work is at the top:
 * unconfirmed-and-flagged first (riskiest first), then unconfirmed, then
 * everything already confirmed.
 */
export function flagConditions(
  conditions: ReviewableCondition[],
  bidQuantities: BidQuantity[] = [],
): FlaggedCondition[] {
  const withObjective = conditions.map((condition) => ({
    condition,
    flags: objectiveFlags(condition, bidQuantities),
  }))

  // Noise guard — see EXTRACTOR_NOTE_NOISE_RATIO.
  const noteCount = conditions.filter((c) => c.flagReason?.trim()).length
  const notesAreNoise =
    conditions.length > 0 && noteCount / conditions.length > EXTRACTOR_NOTE_NOISE_RATIO

  const flagged: FlaggedCondition[] = withObjective.map(({ condition, flags }) => {
    const all = [...flags]
    if (!notesAreNoise) {
      const note = extractorNote(condition, flags)
      if (note) all.push(note)
    }
    all.sort((a, b) => b.severity - a.severity)
    return {
      ...condition,
      flags: all,
      riskScore: all.reduce((max, flag) => Math.max(max, flag.severity), 0),
    }
  })

  return flagged.sort((a, b) => {
    // Confirmed rows sink regardless of risk — they're done.
    if (a.isConfirmed !== b.isConfirmed) return a.isConfirmed ? 1 : -1
    if (a.riskScore !== b.riskScore) return b.riskScore - a.riskScore
    return (a.sourcePage ?? 0) - (b.sourcePage ?? 0)
  })
}

/** True when the model flagged so much of this quote that its notes were muted. Surfaced in the UI so the suppression is never silent. */
export function extractorNotesWereMuted(conditions: ReviewableCondition[]): boolean {
  if (conditions.length === 0) return false
  const noteCount = conditions.filter((c) => c.flagReason?.trim()).length
  return noteCount / conditions.length > EXTRACTOR_NOTE_NOISE_RATIO
}

export type ReviewProgress = {
  confirmed: number
  total: number
  /** Unconfirmed rows carrying at least one flag. */
  flaggedRemaining: number
  isComplete: boolean
  /** "14 of 18 confirmed" */
  label: string
}

export function reviewProgress(conditions: FlaggedCondition[]): ReviewProgress {
  const total = conditions.length
  const confirmed = conditions.filter((c) => c.isConfirmed).length
  const flaggedRemaining = conditions.filter((c) => !c.isConfirmed && c.riskScore > 0).length

  return {
    confirmed,
    total,
    flaggedRemaining,
    isComplete: total > 0 && confirmed === total,
    label: `${confirmed} of ${total} confirmed`,
  }
}

/**
 * Display labels for quote_condition_category. Lives here rather than in the
 * Server Action file because a "use server" module may only export async
 * functions — and because the client-side row renderer needs these too.
 */
export const CONDITION_CATEGORY_LABELS: Record<string, string> = {
  exclusion: "Exclusion",
  inclusion: "Inclusion",
  mobilization: "Mobilization",
  pricing_basis: "Pricing basis",
  minimum_charge: "Minimum charge",
  quantity_assumption: "Quantity assumption",
  price_validity: "Price validity",
  bond: "Bond",
  tax: "Tax",
  prevailing_wage: "Prevailing wage",
  traffic_control: "Traffic control",
  work_hours: "Work hours",
  material_supply: "Material supply",
  disposal: "Disposal",
  site_access: "Site access",
  weather: "Weather",
  insurance: "Insurance",
  retainage: "Retainage",
  other: "Other",
}
