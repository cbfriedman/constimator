import type { costItems } from "@/db/schema"

type CostItemRow = typeof costItems.$inferSelect

export type RateMatch = {
  costItem: CostItemRow
  /** Crude 0-1 word-overlap score — a hint, not a real similarity model. */
  score: number
}

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

// Exact-word matching alone misses extremely common construction pairings
// — "Excavation"/"Excavator", "Grading"/"Grader", "Paving"/"Paver" — that
// share a root but aren't the same token. Comparing a fixed-length prefix
// instead of the whole word is a crude stand-in for real stemming, good
// enough to catch those without pulling in an NLP dependency for what's
// explicitly a "suggestion, not authoritative" feature.
const PREFIX_LEN = 5

function wordsMatch(a: string, b: string): boolean {
  if (a === b) return true
  if (a.length < PREFIX_LEN || b.length < PREFIX_LEN) return false
  return a.slice(0, PREFIX_LEN) === b.slice(0, PREFIX_LEN)
}

/**
 * Best-effort keyword match between an extracted item and the org's
 * labor/equipment cost_item rates — a starting point for the contractor to
 * confirm or correct, not an authoritative price lookup. There's no
 * production-rate data in this schema (crew/production rates were
 * explicitly scoped out of cost_item — see the step 14 discussion) to
 * convert a quantity into labor/equipment hours, so matching a rate here
 * doesn't imply a price can be responsibly computed from it.
 */
export function findCandidateRates(
  item: { trade: string; description: string },
  costItemRows: CostItemRow[],
  limit = 3,
): RateMatch[] {
  const queryWords = [...normalize(item.trade), ...normalize(item.description)]

  return costItemRows
    .filter((row) => row.category === "labor" || row.category === "equipment")
    .map((row) => {
      const labelWords = normalize(row.label)
      const overlap = labelWords.filter((labelWord) =>
        queryWords.some((queryWord) => wordsMatch(queryWord, labelWord)),
      ).length
      const score = labelWords.length === 0 ? 0 : overlap / labelWords.length
      return { costItem: row, score }
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
