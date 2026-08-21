// The leveling grid: one trade's sub quotes side by side, condition by
// condition (step 42).
//
// The premise this screen rests on is the extractor's own framing — "the low
// quote is usually low for a reason." A base price only means something once
// you can see what each sub left out, so the grid's job is to make unlike
// quotes comparable and then re-rank them on the number that actually matters.
//
// Two modelling decisions worth knowing before reading on:
//
// 1. Rows are quote_condition_category values, not free text. That enum was
//    made closed for exactly this ("the whole point of the comparison grid is
//    that the same condition lines up across every sub's quote" —
//    db/schema.ts), and it is what lets a row mean the same thing in every
//    column without guessing at semantic equivalence.
//
// 2. "Not stated" is a first-class outcome, never folded into "excluded". The
//    extraction prompt is explicit that "a quote that never mentions traffic
//    control has NOT excluded traffic control — it has said nothing about it,
//    and those are different facts a human will act on differently." Treating
//    silence as exclusion would invent a gap; treating it as inclusion would
//    hide one.

export type CellStance = "included" | "excluded" | "not_stated" | "value"

export type CellEntry = {
  conditionId: string
  stance: CellStance
  /** What to show: the normalized restatement when there is one, else the verbatim wording. */
  detail: string
  isConfirmed: boolean
  /** What it costs the prime to cover this themselves. Null means not yet costed — not zero. */
  primeCostUsd: number | null
}

export type ComparisonCell = {
  subQuoteId: string
  stance: CellStance
  entries: CellEntry[]
}

export type RowFlag = "gap" | "overlap"

export type ComparisonRow = {
  category: string
  label: string
  /** Not every column says the same thing. This is where the money is. */
  subsDiffer: boolean
  flags: RowFlag[]
  /**
   * Whether gap/overlap can be judged here at all. False for the free-text
   * categories (exclusion / inclusion / other), where two subs' entries can't
   * be known to describe the same scope without guessing.
   */
  comparable: boolean
  cells: ComparisonCell[]
}

export type ComparisonColumn = {
  subQuoteId: string
  subName: string
  basePriceUsd: number | null
  /** Base plus every costed exclusion. Null when no base price is known. */
  adjustedPriceUsd: number | null
  /** Exclusions with no cost entered yet — while this is above zero the adjusted price is provisional. */
  uncostedExclusions: number
  /** Conditions on this quote nobody has confirmed yet. */
  unverifiedCount: number
  /** 1 = cheapest. Null when the price is unknown, so it can't be ranked. */
  baseRank: number | null
  adjustedRank: number | null
}

export type ComparisonGrid = {
  trade: string
  columns: ComparisonColumn[]
  rows: ComparisonRow[]
}

export type ComparisonInputQuote = {
  subQuoteId: string
  subName: string
  trade: string
  totalAmount: string | null
}

export type ComparisonInputCondition = {
  id: string
  subQuoteId: string
  category: string
  rawText: string
  normalizedValue: string | null
  isConfirmed: boolean
  primeCostUsd: string | null
}

// ---------------------------------------------------------------------------
// Stance
// ---------------------------------------------------------------------------

// Checked before the inclusion pattern, so "not included" and "not in our
// scope" resolve to excluded rather than matching on the word "included".
const EXCLUSION_PATTERN =
  /(\bexclud\w*|\bexcl\.|\bnot included\b|\bnot in (our |the )?scope\b|\bby others\b|\bby (the )?(owner|prime|gc|general)\b|\bomitted\b|\bnot provided\b|\bn\/a\b)/i

const INCLUSION_PATTERN =
  /(\bincluded\b|\bincludes\b|\bincluding\b|\bincl\.|\bcarried\b|\bprovided\b|\bfurnish\w*|\bcovered\b|\bin our scope\b)/i

/**
 * Free-text categories. Their entries are real conditions and are shown, but
 * two subs' entries in one of these rows can't be assumed to describe the same
 * scope — "excludes dewatering" and "excludes rock excavation" both land in
 * `exclusion`. Claiming a gap or an overlap across them would be a guess about
 * meaning, and a gap flag is a claim about money.
 */
const FREE_TEXT_CATEGORIES = new Set(["exclusion", "inclusion", "other"])

/** Money-relevant topics first; the rest keep a stable, predictable order. */
const CATEGORY_ORDER = [
  "traffic_control",
  "mobilization",
  "prevailing_wage",
  "bond",
  "insurance",
  "tax",
  "disposal",
  "material_supply",
  "quantity_assumption",
  "pricing_basis",
  "minimum_charge",
  "site_access",
  "work_hours",
  "weather",
  "retainage",
  "price_validity",
  "exclusion",
  "inclusion",
  "other",
]

export function classifyStance(condition: {
  category: string
  rawText: string
  normalizedValue: string | null
}): CellStance {
  // The stance categories say it outright; no need to read the wording.
  if (condition.category === "exclusion") return "excluded"
  if (condition.category === "inclusion") return "included"

  const text = `${condition.normalizedValue ?? ""} ${condition.rawText}`
  if (EXCLUSION_PATTERN.test(text)) return "excluded"
  if (INCLUSION_PATTERN.test(text)) return "included"

  // A stated term that isn't a simple in-or-out: "5% payment bond", "price
  // firm 30 days", "2 mobilizations". Shown as its value.
  return "value"
}

function detailFor(condition: ComparisonInputCondition): string {
  const normalized = condition.normalizedValue?.trim()
  if (normalized) return normalized
  return condition.rawText.trim()
}

function toNumber(value: string | null): number | null {
  if (value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** All entries agreeing gives the cell that stance; a mix is shown as a value, since no single label is true of it. */
function cellStance(entries: CellEntry[]): CellStance {
  if (entries.length === 0) return "not_stated"
  const first = entries[0].stance
  return entries.every((entry) => entry.stance === first) ? first : "value"
}

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

export function buildComparisonGrid(
  trade: string,
  quotes: ComparisonInputQuote[],
  conditions: ComparisonInputCondition[],
): ComparisonGrid {
  const quoteIds = new Set(quotes.map((quote) => quote.subQuoteId))
  const relevant = conditions.filter((condition) => quoteIds.has(condition.subQuoteId))

  // Only categories some sub actually raised become rows. Rendering all
  // nineteen would bury four real differences under fifteen empty lines.
  const categories = [...new Set(relevant.map((condition) => condition.category))].sort(
    (a, b) => categoryRank(a) - categoryRank(b),
  )

  const rows: ComparisonRow[] = categories.map((category) => {
    const cells: ComparisonCell[] = quotes.map((quote) => {
      const entries: CellEntry[] = relevant
        .filter(
          (condition) =>
            condition.subQuoteId === quote.subQuoteId && condition.category === category,
        )
        .map((condition) => ({
          conditionId: condition.id,
          stance: classifyStance(condition),
          detail: detailFor(condition),
          isConfirmed: condition.isConfirmed,
          primeCostUsd: toNumber(condition.primeCostUsd),
        }))

      return { subQuoteId: quote.subQuoteId, stance: cellStance(entries), entries }
    })

    const comparable = !FREE_TEXT_CATEGORIES.has(category)
    const includedCount = cells.filter((cell) => cell.stance === "included").length
    const excludedCount = cells.filter((cell) => cell.stance === "excluded").length

    const flags: RowFlag[] = []
    if (comparable) {
      // A gap needs someone to have said "not me" — otherwise every category
      // nobody happened to mention would be flagged, and a grid where
      // everything is flagged tells you nothing.
      if (excludedCount > 0 && includedCount === 0) flags.push("gap")
      if (includedCount >= 2) flags.push("overlap")
    }

    return {
      category,
      label: COMPARISON_CATEGORY_LABELS[category] ?? category,
      subsDiffer: new Set(cells.map((cell) => cell.stance)).size > 1,
      flags,
      comparable,
      cells,
    }
  })

  return { trade, columns: buildColumns(quotes, rows, relevant), rows: sortRows(rows) }
}

function categoryRank(category: string): number {
  const index = CATEGORY_ORDER.indexOf(category)
  return index === -1 ? CATEGORY_ORDER.length : index
}

/** Rows carrying a flag first, then rows where the subs disagree, then the ones everybody answered the same way. */
function sortRows(rows: ComparisonRow[]): ComparisonRow[] {
  const weight = (row: ComparisonRow) => (row.flags.length > 0 ? 0 : row.subsDiffer ? 1 : 2)
  return [...rows].sort((a, b) => {
    const byWeight = weight(a) - weight(b)
    if (byWeight !== 0) return byWeight
    return categoryRank(a.category) - categoryRank(b.category)
  })
}

function buildColumns(
  quotes: ComparisonInputQuote[],
  rows: ComparisonRow[],
  conditions: ComparisonInputCondition[],
): ComparisonColumn[] {
  const columns = quotes.map((quote) => {
    const base = toNumber(quote.totalAmount)

    const exclusions = rows
      .flatMap((row) => row.cells.filter((cell) => cell.subQuoteId === quote.subQuoteId))
      .flatMap((cell) => cell.entries)
      .filter((entry) => entry.stance === "excluded")

    const costed = exclusions.filter((entry) => entry.primeCostUsd != null)
    const adders = costed.reduce((sum, entry) => sum + (entry.primeCostUsd ?? 0), 0)

    return {
      subQuoteId: quote.subQuoteId,
      subName: quote.subName,
      basePriceUsd: base,
      adjustedPriceUsd: base == null ? null : base + adders,
      uncostedExclusions: exclusions.length - costed.length,
      unverifiedCount: conditions.filter(
        (condition) => condition.subQuoteId === quote.subQuoteId && !condition.isConfirmed,
      ).length,
      baseRank: null as number | null,
      adjustedRank: null as number | null,
    }
  })

  assignRanks(columns, "basePriceUsd", "baseRank")
  assignRanks(columns, "adjustedPriceUsd", "adjustedRank")
  return columns
}

/** Cheapest is 1. A quote with no printed total is left unranked rather than sorted to one end as if it were free or infinite. */
function assignRanks(
  columns: ComparisonColumn[],
  priceKey: "basePriceUsd" | "adjustedPriceUsd",
  rankKey: "baseRank" | "adjustedRank",
): void {
  const priced = columns
    .filter((column) => column[priceKey] != null)
    .sort((a, b) => (a[priceKey] as number) - (b[priceKey] as number))

  priced.forEach((column, index) => {
    column[rankKey] = index + 1
  })
}

/** Column order for the grid. Unpriced quotes sort last — they can't be ranked, but they still have to be visible. */
export function sortColumns(
  columns: ComparisonColumn[],
  by: "base" | "adjusted",
): ComparisonColumn[] {
  const rankKey = by === "base" ? "baseRank" : "adjustedRank"
  return [...columns].sort((a, b) => {
    const aRank = a[rankKey]
    const bRank = b[rankKey]
    if (aRank == null && bRank == null) return a.subName.localeCompare(b.subName)
    if (aRank == null) return 1
    if (bRank == null) return -1
    return aRank - bRank
  })
}

/** Reorders each row's cells to match a column order, so the grid stays aligned after a sort. */
export function alignRowsToColumns(
  rows: ComparisonRow[],
  columns: ComparisonColumn[],
): ComparisonRow[] {
  return rows.map((row) => ({
    ...row,
    cells: columns
      .map((column) => row.cells.find((cell) => cell.subQuoteId === column.subQuoteId))
      .filter((cell): cell is ComparisonCell => cell != null),
  }))
}

export const COMPARISON_CATEGORY_LABELS: Record<string, string> = {
  traffic_control: "Traffic control",
  mobilization: "Mobilization",
  prevailing_wage: "Prevailing wage",
  bond: "Bond",
  insurance: "Insurance",
  tax: "Tax",
  disposal: "Disposal / haul-off",
  material_supply: "Material supply",
  quantity_assumption: "Quantity assumptions",
  pricing_basis: "Pricing basis",
  minimum_charge: "Minimum charge",
  site_access: "Site access",
  work_hours: "Work hours",
  weather: "Weather",
  retainage: "Retainage",
  price_validity: "Price validity",
  exclusion: "Other exclusions",
  inclusion: "Other inclusions",
  other: "Other conditions",
}
