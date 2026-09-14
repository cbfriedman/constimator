import type { costItems } from "@/db/schema"

import { findCandidateRates } from "./rate-matching"
import type { ExtractedTakeoffItem, GeneratedEstimateLine } from "./types"

type CostItemRow = typeof costItems.$inferSelect

/**
 * The org's configured general markup, or null if they have not set one.
 *
 * Returns null rather than falling back to a flat 10%. The old fallback was
 * written when every new org was seeded with a 10% general-markup row, so
 * "10" looked like a harmless restatement of the default — but once seeding
 * stopped writing values (see app/cost-setup/actions.ts), that fallback
 * became the thing it was pretending not to be: a fabricated margin stamped
 * onto every line of a real bid, for an org that had never entered one. Ten
 * percent is plausible enough that nobody would question it, which is
 * exactly what makes it dangerous. Note lib/estimate-view.ts's sumLineMarkup
 * already records a pre-launch audit finding where a hardcoded flat 10% in
 * the Bid Total was wrong for any org whose real markup wasn't 10%; this is
 * the same mistake one layer down.
 *
 * A row that exists with an unset (NULL) value is "not configured", same as
 * no row at all. A row explicitly set to 0 is a real answer and is honoured.
 */
function getOrgMarkupPct(costItemRows: CostItemRow[]): number | null {
  const generalMarkup = costItemRows.find(
    (row) => row.category === "margin" && /general markup/i.test(row.label),
  )
  if (generalMarkup?.percentValue == null) return null

  const value = Number(generalMarkup.percentValue)
  return Number.isFinite(value) ? value : null
}

// True only if the row carries a rate the org actually entered. Cost Setup
// creates rows as an editable scaffold with NULL rates (see
// app/cost-setup/actions.ts), and those must not be offered as suggestions.
function hasRate(costItem: CostItemRow): boolean {
  if (costItem.category === "labor") {
    return costItem.baseRate != null || costItem.fringeRate != null
  }
  if (costItem.category === "equipment") {
    return costItem.rate != null
  }
  return false
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
    // A candidate is only useful if it carries an actual rate. A scaffold row
    // the org hasn't filled in yet matches by name just as well, and
    // suggesting "Operator — Group 3 ($0.00/hr)" reads as a real answer.
    const bestMatch = findCandidateRates(item, costItemRows).find((candidate) =>
      hasRate(candidate.costItem),
    )

    const noteParts: string[] = []
    if (item.notes) noteParts.push(item.notes)
    noteParts.push(
      bestMatch
        ? `Possible rate: ${describeCandidate(bestMatch.costItem)} — unpriced, needs review.`
        : "No matching company rate found — needs pricing.",
    )
    if (markupPct == null) {
      // Says it on the line itself, because the line is where someone will
      // be looking when they wonder why the bid total has no margin in it.
      noteParts.push("Company markup not set — set it in Cost Setup before bidding.")
    }

    return {
      description: item.description,
      quantity: String(item.quantity),
      unit: item.unit,
      unitPrice: "0",
      // 0, not a guessed default. markup_pct is a NOT NULL numeric column, so
      // "unset" has to be carried by the note above rather than by the value.
      markupPct: String(markupPct ?? 0),
      total: "0",
      source: "ai_extracted",
      note: noteParts.join(" "),
    }
  })
}
