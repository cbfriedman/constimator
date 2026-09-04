import type { StatusColor } from "@/lib/reconciliation-data"

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
    hasPreview: true,
  },
  {
    id: "quantity-summary",
    name: "Quantity Summary",
    description: "Quantities by unit",
    hasPreview: true,
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
    description: "Labor cost by line item",
    hasPreview: true,
  },
  {
    id: "material-summary",
    name: "Material Summary",
    description: "Material cost by line item",
    hasPreview: true,
  },
  {
    id: "equipment-summary",
    name: "Equipment Summary",
    description: "Equipment cost by line item",
    hasPreview: true,
  },
  {
    id: "proposal-summary",
    name: "Proposal Summary",
    description: "Client-facing bid items and totals",
    hasPreview: true,
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
