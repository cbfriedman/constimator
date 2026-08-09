import type { SourceKind } from "@/components/source-badge"
import type { estimateLines } from "@/db/schema"

type EstimateLineRow = typeof estimateLines.$inferSelect
type DbSourceKind = EstimateLineRow["source"]

// Unformatted values, straight from the DB row — used to pre-populate the
// edit dialog. The sibling fields above (qty, unitPrice, labor, ...) are
// display-formatted (commas, $, em dashes for null) and not safe to parse
// back for editing.
export type EstimateLineFormValues = {
  description: string
  note: string
  quantity: string
  unit: string
  unitPrice: string
  laborCost: string
  materialCost: string
  equipmentCost: string
  subCost: string
  markupPct: string
}

export type EstimateLineView = {
  id: string
  description: string
  note?: string
  qty: string
  unit: string
  unitPrice: string
  labor: string
  material: string
  equip: string
  sub: string
  mu: string
  total: string
  source: SourceKind
  raw: EstimateLineFormValues
}

const DB_TO_UI_SOURCE: Record<DbSourceKind, SourceKind> = {
  official: "official",
  ai_extracted: "ai-extracted",
  manual: "manual",
  reviewed: "reviewed",
  overridden: "overridden",
}

export const UI_TO_DB_SOURCE: Record<SourceKind, DbSourceKind> = {
  official: "official",
  "ai-extracted": "ai_extracted",
  manual: "manual",
  reviewed: "reviewed",
  overridden: "overridden",
}

function formatMoney(value: string | null): string {
  if (value == null) return "—"
  const n = Number(value)
  if (Number.isNaN(n)) return "—"
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatQty(value: string): string {
  const n = Number(value)
  if (Number.isNaN(n)) return value
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

export function toEstimateLineView(row: EstimateLineRow): EstimateLineView {
  return {
    id: row.id,
    description: row.description,
    note: row.note ?? undefined,
    qty: formatQty(row.quantity),
    unit: row.unit,
    unitPrice: formatMoney(row.unitPrice),
    labor: formatMoney(row.laborCost),
    material: formatMoney(row.materialCost),
    equip: formatMoney(row.equipmentCost),
    sub: formatMoney(row.subCost),
    mu: String(Math.round(Number(row.markupPct))),
    total: formatMoney(row.total),
    source: DB_TO_UI_SOURCE[row.source],
    raw: {
      description: row.description,
      note: row.note ?? "",
      quantity: row.quantity,
      unit: row.unit,
      unitPrice: row.unitPrice,
      laborCost: row.laborCost ?? "",
      materialCost: row.materialCost ?? "",
      equipmentCost: row.equipmentCost ?? "",
      subCost: row.subCost ?? "",
      markupPct: row.markupPct,
    },
  }
}

export function sumLineTotals(rows: EstimateLineRow[]): number {
  return rows.reduce((sum, row) => sum + Number(row.total), 0)
}

// row.total is the pre-markup extended price (quantity × unit price —
// see the comment on computeTotal in app/estimate/actions.ts); markup is
// applied per line using that line's own markupPct (set from the org's
// configured default when a line is created, editable per line after
// that — see lib/cost-engine/generate-estimate.ts's getOrgMarkupPct).
// Found during a pre-launch audit: callers were computing "Bid Total"
// with a hardcoded flat 10% instead of this, so it was wrong for any org
// whose real markup wasn't exactly 10%.
export function sumLineMarkup(rows: EstimateLineRow[]): number {
  return rows.reduce(
    (sum, row) => sum + Number(row.total) * (Number(row.markupPct) / 100),
    0,
  )
}
