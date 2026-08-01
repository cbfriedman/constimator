import type { bids, estimateLines, reconciliationItems } from "@/db/schema"

type BidRow = typeof bids.$inferSelect
type EstimateLineRow = typeof estimateLines.$inferSelect
type ReconciliationItemRow = typeof reconciliationItems.$inferSelect
type DbFilterKey = ReconciliationItemRow["filters"][number]
type DbStatusColor = ReconciliationItemRow["statusColor"]

export type DiffResult = {
  bidId: string
  estimateLineId: string | null
  diffQuantity: string | null
  diffPct: string | null
  statusLabel: string
  statusColor: DbStatusColor
  attention: boolean
  filters: DbFilterKey[]
  explanation: string | null
}

function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase()
}

function normalizeDescription(description: string): string {
  return description.trim().toLowerCase()
}

/**
 * Matches a bid line to an estimate line — the explicit estimate_line.bidId
 * FK first (set when a line is added via "Add to Estimate" from a prior
 * reconciliation run, or entered directly against a bid item), falling
 * back to an exact, unambiguous description match for lines entered
 * without that link. Deliberately doesn't guess when multiple estimate
 * lines share a description — "no confident match" is safer than picking
 * the wrong one.
 */
function matchEstimateLine(
  bid: BidRow,
  estimateLineRows: EstimateLineRow[],
): EstimateLineRow | undefined {
  const byBidId = estimateLineRows.find((line) => line.bidId === bid.id)
  if (byBidId) return byBidId

  const normalizedBidDescription = normalizeDescription(bid.description)
  const byDescription = estimateLineRows.filter(
    (line) => normalizeDescription(line.description) === normalizedBidDescription,
  )
  return byDescription.length === 1 ? byDescription[0] : undefined
}

/**
 * Real reconciliation: diffs each official bid-form line against the
 * project's estimate lines. Everything compared here is real, user-entered
 * data — no AI extraction involved (that's step 16, still blocked), so
 * there's no ai_quantity/confidence to populate on the resulting rows.
 */
export function diffBidAgainstEstimate(
  bidRows: BidRow[],
  estimateLineRows: EstimateLineRow[],
): DiffResult[] {
  return bidRows.map((bid) => {
    const match = matchEstimateLine(bid, estimateLineRows)

    if (!match) {
      return {
        bidId: bid.id,
        estimateLineId: null,
        diffQuantity: null,
        diffPct: null,
        statusLabel: "Missing from estimate",
        statusColor: "red",
        attention: true,
        filters: ["missing"],
        explanation: `Bid item ${bid.itemNumber} (${bid.description}) has no matching line in your estimate.`,
      }
    }

    const isLumpSum = normalizeUnit(bid.unit) === "ls"
    if (isLumpSum) {
      // Lump-sum quantity is always 1 on both sides — comparing it tells
      // you nothing. What actually needs checking is scope, not quantity.
      return {
        bidId: bid.id,
        estimateLineId: match.id,
        diffQuantity: "0",
        diffPct: "0",
        statusLabel: "Lump sum — verify scope",
        statusColor: "yellow",
        attention: false,
        filters: ["matched", "lump_sum"],
        explanation:
          "Lump sum item — quantity comparison doesn't apply. Confirm your estimate covers the full scope of this item.",
      }
    }

    const unitMismatch = normalizeUnit(bid.unit) !== normalizeUnit(match.unit)
    if (unitMismatch) {
      return {
        bidId: bid.id,
        estimateLineId: match.id,
        diffQuantity: null,
        diffPct: null,
        statusLabel: `Unit mismatch — bid form is ${bid.unit}, estimate is ${match.unit}`,
        statusColor: "yellow",
        attention: true,
        filters: ["unit_converted"],
        explanation: `Official bid form lists this item in ${bid.unit}; your estimate line uses ${match.unit}. Confirm these are equivalent before relying on the quantity comparison.`,
      }
    }

    const officialQty = Number(bid.officialQuantity)
    const estimateQty = Number(match.quantity)
    const diff = estimateQty - officialQty

    if (diff === 0) {
      return {
        bidId: bid.id,
        estimateLineId: match.id,
        diffQuantity: "0",
        diffPct: "0",
        statusLabel: "Match",
        statusColor: "green",
        attention: false,
        filters: ["matched"],
        explanation: null,
      }
    }

    const diffPct = officialQty !== 0 ? (diff / officialQty) * 100 : null

    return {
      bidId: bid.id,
      estimateLineId: match.id,
      diffQuantity: String(diff),
      diffPct: diffPct == null ? null : String(diffPct),
      statusLabel: "Quantity discrepancy",
      statusColor: "amber",
      attention: true,
      filters: ["quantity_discrepancy"],
      explanation: `Official bid form: ${bid.officialQuantity} ${bid.unit}. Your estimate: ${match.quantity} ${match.unit}.`,
    }
  })
}
