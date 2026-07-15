export const projectLabel = "Shasta County Roadway Improvements (#24-118)"
export const projectShort = "#24-118"

export function money(n: number) {
  return `$${n.toFixed(2)}`
}

export function pct(n: number) {
  return `${n.toFixed(1)}%`
}

export type LaborRate = {
  id: string
  classification: string
  base: number
  fringe: number
}

export function laborTotal(row: { base: number; fringe: number }) {
  return row.base + row.fringe
}

export const laborRates: LaborRate[] = [
  { id: "operator-g3", classification: "Operator — Group 3", base: 55.1, fringe: 34.75 },
  { id: "laborer-g1", classification: "Laborer — Group 1", base: 39.62, fringe: 28.4 },
  { id: "teamster", classification: "Teamster — Driver", base: 42.85, fringe: 30.15 },
]

/** Filled in by the "Complete Setup (demo)" action. */
export const cementMasonRate: LaborRate = {
  id: "cement-mason",
  classification: "Cement Mason",
  base: 44.2,
  fringe: 29.6,
}

export type EquipmentRate = {
  id: string
  equipment: string
  rate: number
  unit: string
  ownership: "Owned" | "Rental"
}

export const equipmentRates: EquipmentRate[] = [
  { id: "asphalt-paver", equipment: "Asphalt Paver", rate: 185, unit: "/hr", ownership: "Owned" },
  { id: "roller", equipment: "Vibratory Roller (10-ton)", rate: 95, unit: "/hr", ownership: "Owned" },
  { id: "excavator", equipment: "Excavator (CAT 330)", rate: 145, unit: "/hr", ownership: "Rental" },
  { id: "loader", equipment: "Loader (966)", rate: 118, unit: "/hr", ownership: "Owned" },
]

/** Filled in by the "Complete Setup (demo)" action. */
export const waterTruckRate: EquipmentRate = {
  id: "water-truck",
  equipment: "Water Truck (4,000 gal)",
  rate: 88,
  unit: "/hr",
  ownership: "Rental",
}

export type MarginField = {
  id: string
  label: string
  value: number
  helper?: string
  /** Insurance is blank + required until setup is complete. */
  requiredWhenIncomplete?: boolean
}

export const marginFields: MarginField[] = [
  { id: "overhead", label: "Overhead", value: 8.0 },
  { id: "profit", label: "Profit", value: 5.0 },
  {
    id: "general-markup",
    label: "General Markup",
    value: 10.0,
    helper: "Currently applied to the Shasta County estimate",
  },
  { id: "bond", label: "Bond Premium", value: 1.2, helper: "of contract value" },
  {
    id: "insurance",
    label: "Insurance (GL/umbrella)",
    value: 1.5,
    requiredWhenIncomplete: true,
  },
]

/** Project-level overrides keyed by rate/field id. */
export type Override =
  | { kind: "labor"; base: number; fringe: number }
  | { kind: "equipment"; rate: number }
  | { kind: "margin"; value: number }

/** One override is pre-seeded so it is visible without editing. */
export const seededOverrides: Record<string, Override> = {
  // Laborer — Group 1 project override: $70.10 total/hr for #24-118
  "laborer-g1": { kind: "labor", base: 41.7, fringe: 28.4 },
}

export type RateHistoryEntry = {
  id: string
  date: string
  user: string
  change: string
  scope: string
  note: string
}

export const rateHistorySeed: RateHistoryEntry[] = [
  {
    id: "h1",
    date: "Jul 12, 2026 9:41 AM",
    user: "Mike Torres",
    change: "Operator Grp 3: $88.10 → $89.85",
    scope: "Company default",
    note: "DIR determination 2026-2",
  },
  {
    id: "h2",
    date: "Jun 30, 2026 3:15 PM",
    user: "Sarah Chen",
    change: "Asphalt Paver: $175.00 → $185.00",
    scope: "Company default",
    note: "New machine payment",
  },
  {
    id: "h3",
    date: "Jun 12, 2026 11:02 AM",
    user: "Sarah Chen",
    change: "Overhead: 7.5% → 8.0%",
    scope: "Company default",
    note: "FY26 budget",
  },
  {
    id: "h4",
    date: "Jun 12, 2026 10:58 AM",
    user: "Sarah Chen",
    change: "Profit: 4.5% → 5.0%",
    scope: "Company default",
    note: "FY26 budget",
  },
]

export type ProductionRow = {
  activity: string
  rate: string
  comingSoon?: boolean
}

export const productionRows: ProductionRow[] = [
  { activity: "HMA Paving", rate: "485 TON/day" },
  { activity: "RCP Install", rate: "120 LF/day" },
  { activity: "Labor production database", rate: "Coming soon", comingSoon: true },
  { activity: "Labor production database", rate: "Coming soon", comingSoon: true },
]

export const crewCards = [
  { name: "Paving Crew", composition: "1 Operator, 6 Laborers, 1 Teamster" },
  { name: "Pipe Crew", composition: "2 Operators, 4 Laborers" },
]

export const costSetupSections = [
  { id: "labor-rates", label: "Labor Rates" },
  { id: "equipment-rates", label: "Equipment Rates" },
  { id: "markups-margins", label: "Markups & Margins" },
  { id: "taxes", label: "Taxes" },
  { id: "indirects-mobilization", label: "Indirects & Mobilization" },
  { id: "crew-production", label: "Crew & Production" },
] as const

export type CostSetupSectionId = (typeof costSetupSections)[number]["id"]
