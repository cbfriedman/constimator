import type { bids, estimateLines, reconciliationItems } from "@/db/schema"
import type { FilterKey, StatusColor } from "@/lib/reconciliation-data"

type BidRow = typeof bids.$inferSelect
type ReconciliationItemRow = typeof reconciliationItems.$inferSelect
type EstimateLineRow = typeof estimateLines.$inferSelect
type DbFilterKey = ReconciliationItemRow["filters"][number]

const DB_TO_UI_FILTER: Record<DbFilterKey, FilterKey> = {
  matched: "matched",
  quantity_discrepancy: "quantity-discrepancy",
  low_confidence: "low-confidence",
  missing: "missing",
  lump_sum: "lump-sum",
  unit_converted: "unit-converted",
}

export const UI_TO_DB_FILTER: Record<FilterKey, DbFilterKey | null> = {
  all: null,
  matched: "matched",
  "quantity-discrepancy": "quantity_discrepancy",
  "low-confidence": "low_confidence",
  missing: "missing",
  "lump-sum": "lump_sum",
  "unit-converted": "unit_converted",
}

export type ReconciliationRowView = {
  id: string
  itemNumber: string
  description: string
  unit: string
  officialQty: string
  aiQty: string
  estimateQty: string
  diff: string
  pctDiff: string
  confidence: number
  planSheets: string
  spec: string
  statusLabel: string
  statusColor: StatusColor
  attention: boolean
  filters: FilterKey[]
  explanation?: string
  addable?: boolean
}

function formatQty(value: string | null): string {
  if (value == null) return "—"
  const n = Number(value)
  if (Number.isNaN(n)) return "—"
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

function formatDiff(value: string | null): string {
  if (value == null) return "—"
  const n = Number(value)
  if (Number.isNaN(n)) return "—"
  if (n === 0) return "0"
  const sign = n > 0 ? "+" : "−"
  return `${sign}${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
}

function formatPctDiff(value: string | null): string {
  if (value == null) return "—"
  const n = Number(value)
  if (Number.isNaN(n)) return "—"
  if (n === 0) return "0%"
  const sign = n > 0 ? "+" : "−"
  return `${sign}${Math.abs(n).toFixed(1)}%`
}

export function toReconciliationRow(
  item: ReconciliationItemRow,
  bid: BidRow,
  estimateLine: EstimateLineRow | undefined,
): ReconciliationRowView {
  return {
    id: item.id,
    itemNumber: bid.itemNumber,
    description: bid.description,
    unit: bid.unit,
    officialQty: formatQty(bid.officialQuantity),
    aiQty: formatQty(item.aiQuantity),
    estimateQty: estimateLine ? formatQty(estimateLine.quantity) : "—",
    diff: formatDiff(item.diffQuantity),
    pctDiff: formatPctDiff(item.diffPct),
    confidence: item.confidence == null ? 0 : Math.round(Number(item.confidence)),
    planSheets: item.planSheets ?? "—",
    spec: bid.specSection ?? "—",
    statusLabel: item.statusLabel,
    statusColor: item.statusColor,
    attention: item.attention,
    filters: item.filters.map((f) => DB_TO_UI_FILTER[f]),
    explanation: item.explanation ?? undefined,
    addable: !estimateLine,
  }
}
