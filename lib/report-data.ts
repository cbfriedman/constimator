import { reconciliationRows, type StatusColor } from "@/lib/reconciliation-data"

export type ReportId =
  | "estimate-summary"
  | "detailed-estimate"
  | "quantity-summary"
  | "reconciliation"
  | "labor-summary"
  | "material-summary"
  | "equipment-summary"
  | "proposal-summary"

export type ReportDef = {
  id: ReportId
  name: string
  description: string
  hasPreview: boolean
  recommended?: boolean
}

export const reports: ReportDef[] = [
  {
    id: "estimate-summary",
    name: "Estimate Summary",
    description: "Bid items, unit prices, and totals",
    hasPreview: true,
  },
  {
    id: "detailed-estimate",
    name: "Detailed Estimate",
    description: "Full cost breakdown per item",
    hasPreview: false,
  },
  {
    id: "quantity-summary",
    name: "Quantity Summary",
    description: "Quantities by category",
    hasPreview: false,
  },
  {
    id: "reconciliation",
    name: "Bid Form Reconciliation Report",
    description: "Estimate vs. official bid form",
    hasPreview: true,
    recommended: true,
  },
  {
    id: "labor-summary",
    name: "Labor Summary",
    description: "Labor hours and cost by trade",
    hasPreview: false,
  },
  {
    id: "material-summary",
    name: "Material Summary",
    description: "Material takeoff and pricing",
    hasPreview: false,
  },
  {
    id: "equipment-summary",
    name: "Equipment Summary",
    description: "Equipment hours and rates",
    hasPreview: false,
  },
  {
    id: "proposal-summary",
    name: "Proposal Summary",
    description: "Client-facing proposal package",
    hasPreview: false,
  },
]

export const provenanceLegend: { label: string; dotClass: string }[] = [
  { label: "Official bid form quantity", dotClass: "bg-primary" },
  { label: "AI-extracted", dotClass: "bg-warning" },
  { label: "Contractor-entered", dotClass: "bg-muted-foreground" },
  { label: "Human-reviewed", dotClass: "bg-review" },
  { label: "Manually overridden", dotClass: "bg-destructive" },
]

export const disclosureText =
  "Portions of this report were generated with AI assistance from uploaded project documents. Quantities and requirements should be independently verified against the official contract documents before bid submission. The official bid form governs in any conflict."

export type ReportReconRow = {
  id: number
  description: string
  unit: string
  officialQty: string
  aiQty: string
  estimateQty: string
  statusLabel: string
  statusColor: StatusColor | "purple"
}

/**
 * Post-fix reconciliation state for the report:
 * - item 15 is matched (added to estimate)
 * - item 8 is resolved to 640 LF and human-reviewed
 */
export const reportReconRows: ReportReconRow[] = reconciliationRows.map(
  (row): ReportReconRow => {
    if (row.id === 15) {
      return {
        id: row.id,
        description: row.description,
        unit: row.unit,
        officialQty: row.officialQty,
        aiQty: row.aiQty,
        estimateQty: "2,150",
        statusLabel: "Match — added",
        statusColor: "green",
      }
    }
    if (row.id === 8) {
      return {
        id: row.id,
        description: row.description,
        unit: row.unit,
        officialQty: row.officialQty,
        aiQty: row.aiQty,
        estimateQty: "640",
        statusLabel: "Human-reviewed",
        statusColor: "purple",
      }
    }
    return {
      id: row.id,
      description: row.description,
      unit: row.unit,
      officialQty: row.officialQty,
      aiQty: row.aiQty,
      estimateQty: row.estimateQty,
      statusLabel: row.statusLabel,
      statusColor: row.statusColor,
    }
  },
)

export const reportStatusClasses: Record<
  StatusColor | "purple",
  string
> = {
  green: "border-transparent bg-success/10 text-success",
  amber: "border-transparent bg-warning/15 text-warning",
  yellow: "border-transparent bg-caution/15 text-caution",
  red: "border-transparent bg-destructive/10 text-destructive",
  purple: "border-transparent bg-review/10 text-review",
}
