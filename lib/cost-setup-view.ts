import type { costItems } from "@/db/schema"
import type { EquipmentRate, LaborRate, MarginField } from "@/lib/cost-setup-data"

type CostItemRow = typeof costItems.$inferSelect

export function toLaborRates(rows: CostItemRow[]): LaborRate[] {
  return rows
    .filter((row) => row.category === "labor")
    .map((row) => ({
      id: row.id,
      classification: row.label,
      base: Number(row.baseRate),
      fringe: Number(row.fringeRate),
    }))
}

export function toEquipmentRates(rows: CostItemRow[]): EquipmentRate[] {
  return rows
    .filter((row) => row.category === "equipment")
    .map((row) => ({
      id: row.id,
      equipment: row.label,
      rate: Number(row.rate),
      unit: row.rateUnit ?? "/hr",
      ownership: row.ownership === "owned" ? "Owned" : "Rental",
    }))
}

export function toMarginFields(rows: CostItemRow[]): MarginField[] {
  return rows
    .filter((row) => row.category === "margin")
    .map((row) => ({
      id: row.id,
      label: row.label,
      value: Number(row.percentValue),
      helper: row.helperText ?? undefined,
      requiredWhenIncomplete: row.requiredWhenIncomplete,
    }))
}
