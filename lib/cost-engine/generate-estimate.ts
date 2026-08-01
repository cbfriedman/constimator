import type { costItems } from "@/db/schema"

import { findCandidateRates } from "./rate-matching"
import type { ExtractedTakeoffItem, GeneratedEstimateLine } from "./types"

type CostItemRow = typeof costItems.$inferSelect

function getOrgMarkupPct(costItemRows: CostItemRow[]): number {
  const generalMarkup = costItemRows.find(
    (row) => row.category === "margin" && /general markup/i.test(row.label),
  )
  if (generalMarkup?.percentValue != null) {
    const value = Number(generalMarkup.percentValue)
    if (!Number.isNaN(value)) return value
  }
  return 10 // matches the default markup used elsewhere (e.g. seeded estimate lines)
}

function describeCandidate(costItem: CostItemRow): string {
  const rate =
    costItem.category === "labor"
      ? Number(costItem.baseRate ?? 0) + Number(costItem.fringeRate ?? 0)
      : Number(costItem.rate ?? 0)
  return `${costItem.label} ($${rate.toFixed(2)}/hr)`
}

/**
 * Turns raw extracted quantities into draft estimate_line rows.
 *
 * Deliberately does NOT compute a unit price. Doing that responsibly needs
 * a production rate (units per labor/equipment hour) to turn a quantity
 * into cost, and this schema doesn't have one — crew/production rates were
 * explicitly scoped out of cost_item (step 14). Fabricating a price anyway
 * would put a wrong-but-confident-looking number in front of someone
 * pricing a real bid, which is a real-money mistake, not a cosmetic one.
 *
 * Instead: quantity/unit come straight from the extraction (trustworthy
 * once step 16 exists), markup comes from the org's real default, and a
 * plausible labor/equipment rate match — if any — is surfaced in the note
 * for the contractor to use or ignore. This matches how this product
 * already works everywhere else: the system extracts and organizes,
 * pricing is the contractor's call (see docs/DECISIONS.md, Product wedge).
 */
export function generateEstimateLines(
  extractedItems: ExtractedTakeoffItem[],
  costItemRows: CostItemRow[],
): GeneratedEstimateLine[] {
  const markupPct = getOrgMarkupPct(costItemRows)

  return extractedItems.map((item) => {
    const [bestMatch] = findCandidateRates(item, costItemRows)

    const noteParts: string[] = []
    if (item.notes) noteParts.push(item.notes)
    noteParts.push(
      bestMatch
        ? `Possible rate: ${describeCandidate(bestMatch.costItem)} — unpriced, needs review.`
        : "No matching company rate found — needs pricing.",
    )

    return {
      description: item.description,
      quantity: String(item.quantity),
      unit: item.unit,
      unitPrice: "0",
      markupPct: String(markupPct),
      total: "0",
      source: "ai_extracted",
      note: noteParts.join(" "),
    }
  })
}
