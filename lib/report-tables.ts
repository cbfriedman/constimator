import type { EstimateLineView } from "@/lib/estimate-view"

function toNumber(value: string): number {
  const n = Number(value.replace(/[$,]/g, ""))
  return Number.isFinite(n) ? n : 0
}

function formatMoney(n: number): string {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export type TableReport = {
  headers: string[]
  body: string[][]
  totals?: Array<[string, string]>
}

export function detailedEstimateTable(rows: EstimateLineView[]): TableReport {
  return {
    headers: ["Description", "Qty", "Unit", "Labor", "Material", "Equip", "Sub", "Markup %", "Total"],
    body: rows.map((row) => [
      row.description,
      row.qty,
      row.unit,
      row.labor,
      row.material,
      row.equip,
      row.sub,
      `${row.mu}%`,
      row.total,
    ]),
  }
}

export function quantitySummaryTable(rows: EstimateLineView[]): TableReport {
  const byUnit = new Map<string, { qty: number; lines: number }>()
  for (const row of rows) {
    const current = byUnit.get(row.unit) ?? { qty: 0, lines: 0 }
    current.qty += toNumber(row.raw.quantity)
    current.lines += 1
    byUnit.set(row.unit, current)
  }
  return {
    headers: ["Unit", "Line items", "Total quantity"],
    body: [...byUnit.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([unit, value]) => [
        unit,
        String(value.lines),
        value.qty.toLocaleString("en-US", { maximumFractionDigits: 2 }),
      ]),
  }
}

export function costKindTable(
  rows: EstimateLineView[],
  kind: "labor" | "material" | "equip",
): TableReport {
  const field = kind === "labor" ? "laborCost" : kind === "material" ? "materialCost" : "equipmentCost"
  const display = kind === "labor" ? "labor" : kind === "material" ? "material" : "equip"
  const filled = rows.filter((row) => toNumber(row.raw[field]) > 0)
  const total = filled.reduce((sum, row) => sum + toNumber(row.raw[field]), 0)
  const label = kind === "labor" ? "Labor" : kind === "material" ? "Material" : "Equipment"
  return {
    headers: ["Description", "Qty", "Unit", `${label} / unit`],
    body: filled.map((row) => [row.description, row.qty, row.unit, row[display]]),
    totals: [[`${label} total`, formatMoney(total)]],
  }
}

export function proposalTable(rows: EstimateLineView[]): TableReport {
  return {
    headers: ["Description", "Qty", "Unit", "Unit Price", "Total"],
    body: rows.map((row) => [
      row.description,
      row.qty,
      row.unit,
      row.unitPrice,
      row.total,
    ]),
  }
}
