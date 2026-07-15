export type LaborRate = {
  classification: string
  base: string
  fringe: string
  total: string
}

export const laborRates: LaborRate[] = [
  {
    classification: "Operator — Group 3",
    base: "$55.10",
    fringe: "$34.75",
    total: "$89.85",
  },
  {
    classification: "Laborer — Group 1",
    base: "$39.62",
    fringe: "$28.40",
    total: "$68.02",
  },
  {
    classification: "Teamster — Driver",
    base: "$42.85",
    fringe: "$30.15",
    total: "$73.00",
  },
]

/** Filled in by the "Complete Setup (demo)" action. */
export const cementMasonRate: LaborRate = {
  classification: "Cement Mason",
  base: "$44.20",
  fringe: "$29.60",
  total: "$73.80",
}

export type EquipmentRate = {
  equipment: string
  rate: string
  unit: string
  ownership: "Owned" | "Rental"
}

export const equipmentRates: EquipmentRate[] = [
  { equipment: "Asphalt Paver", rate: "$185.00", unit: "/hr", ownership: "Owned" },
  {
    equipment: "Vibratory Roller (10-ton)",
    rate: "$95.00",
    unit: "/hr",
    ownership: "Owned",
  },
  {
    equipment: "Excavator (CAT 330)",
    rate: "$145.00",
    unit: "/hr",
    ownership: "Rental",
  },
  { equipment: "Loader (966)", rate: "$118.00", unit: "/hr", ownership: "Owned" },
]

/** Filled in by the "Complete Setup (demo)" action. */
export const waterTruckRate: EquipmentRate = {
  equipment: "Water Truck (4,000 gal)",
  rate: "$88.00",
  unit: "/hr",
  ownership: "Rental",
}

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
  {
    name: "Paving Crew",
    composition: "1 Operator, 6 Laborers, 1 Teamster",
  },
  {
    name: "Pipe Crew",
    composition: "2 Operators, 4 Laborers",
  },
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
