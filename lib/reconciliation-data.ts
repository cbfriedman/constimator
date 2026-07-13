export type StatusColor = "green" | "amber" | "yellow" | "red"

export type FilterKey =
  | "all"
  | "matched"
  | "quantity-discrepancy"
  | "low-confidence"
  | "missing"
  | "lump-sum"
  | "unit-converted"

export type ReconRow = {
  id: number
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
  /** Whether this row counts toward "items need attention". */
  attention: boolean
  /** Which filter chips select this row (besides "all"). */
  filters: FilterKey[]
  /** Optional explanation shown in the detail drawer. */
  explanation?: string
  /** Row 15 special: can be added to the estimate. */
  addable?: boolean
}

export const reconciliationRows: ReconRow[] = [
  {
    id: 1,
    description: "Mobilization",
    unit: "LS",
    officialQty: "1",
    aiQty: "1",
    estimateQty: "1",
    diff: "—",
    pctDiff: "—",
    confidence: 100,
    planSheets: "—",
    spec: "00 73 00",
    statusLabel: "Lump Sum — verify scope",
    statusColor: "yellow",
    attention: false,
    filters: ["matched", "lump-sum"],
  },
  {
    id: 2,
    description: "Traffic Control System",
    unit: "LS",
    officialQty: "1",
    aiQty: "1",
    estimateQty: "1",
    diff: "—",
    pctDiff: "—",
    confidence: 100,
    planSheets: "C-701",
    spec: "12-4",
    statusLabel: "Lump Sum — verify scope",
    statusColor: "yellow",
    attention: false,
    filters: ["matched", "lump-sum"],
  },
  {
    id: 3,
    description: "Clearing & Grubbing",
    unit: "LS",
    officialQty: "1",
    aiQty: "1",
    estimateQty: "1",
    diff: "—",
    pctDiff: "—",
    confidence: 97,
    planSheets: "C-101",
    spec: "17-2",
    statusLabel: "Lump Sum — verify scope",
    statusColor: "yellow",
    attention: false,
    filters: ["matched", "lump-sum"],
  },
  {
    id: 4,
    description: "Roadway Excavation",
    unit: "CY",
    officialQty: "8,450",
    aiQty: "8,390",
    estimateQty: "8,450",
    diff: "−60",
    pctDiff: "−0.7%",
    confidence: 94,
    planSheets: "C-101–108",
    spec: "19-2",
    statusLabel: "Match",
    statusColor: "green",
    attention: false,
    filters: ["matched"],
  },
  {
    id: 5,
    description: "Class 2 Aggregate Base",
    unit: "TON",
    officialQty: "6,200",
    aiQty: "6,180",
    estimateQty: "6,200",
    diff: "−20",
    pctDiff: "−0.3%",
    confidence: 96,
    planSheets: "C-201",
    spec: "26-1",
    statusLabel: "Match",
    statusColor: "green",
    attention: false,
    filters: ["matched"],
  },
  {
    id: 6,
    description: "HMA Type A",
    unit: "TON",
    officialQty: "4,850",
    aiQty: "4,850",
    estimateQty: "4,850",
    diff: "0",
    pctDiff: "0%",
    confidence: 98,
    planSheets: "C-201, C-501",
    spec: "39-2",
    statusLabel: "Match — Addendum 01 applied",
    statusColor: "green",
    attention: false,
    filters: ["matched"],
  },
  {
    id: 7,
    description: "Cold Plane AC (2\")",
    unit: "SY",
    officialQty: "12,300",
    aiQty: "12,300",
    estimateQty: "12,300",
    diff: "0",
    pctDiff: "0%",
    confidence: 90,
    planSheets: "C-201",
    spec: "39-1",
    statusLabel: "Unit converted SF→SY",
    statusColor: "yellow",
    attention: false,
    filters: ["matched", "unit-converted"],
    explanation:
      "Plan quantity listed in SF; converted to SY (÷9) to match bid form unit.",
  },
  {
    id: 8,
    description: "18\" RCP Class III",
    unit: "LF",
    officialQty: "640",
    aiQty: "655",
    estimateQty: "655",
    diff: "+15",
    pctDiff: "+2.3%",
    confidence: 88,
    planSheets: "C-301",
    spec: "71-2",
    statusLabel: "Quantity discrepancy",
    statusColor: "amber",
    attention: true,
    filters: ["quantity-discrepancy"],
    explanation:
      "Plan profile totals 655 LF including inlet connections; bid form lists 640 LF.",
  },
  {
    id: 9,
    description: "Drainage Inlet (Type GO)",
    unit: "EA",
    officialQty: "12",
    aiQty: "12",
    estimateQty: "12",
    diff: "0",
    pctDiff: "0%",
    confidence: 95,
    planSheets: "C-301, C-302",
    spec: "71-3",
    statusLabel: "Match",
    statusColor: "green",
    attention: false,
    filters: ["matched"],
  },
  {
    id: 10,
    description: "Adjust Manhole to Grade",
    unit: "EA",
    officialQty: "9",
    aiQty: "9",
    estimateQty: "9",
    diff: "0",
    pctDiff: "0%",
    confidence: 92,
    planSheets: "C-301",
    spec: "71-4",
    statusLabel: "Match",
    statusColor: "green",
    attention: false,
    filters: ["matched"],
  },
  {
    id: 11,
    description: "Thermoplastic Traffic Stripe",
    unit: "LF",
    officialQty: "24,500",
    aiQty: "24,500",
    estimateQty: "24,500",
    diff: "0",
    pctDiff: "0%",
    confidence: 93,
    planSheets: "C-601",
    spec: "84-2",
    statusLabel: "Match",
    statusColor: "green",
    attention: false,
    filters: ["matched"],
  },
  {
    id: 12,
    description: "Pavement Marking Thermo",
    unit: "SF",
    officialQty: "1,850",
    aiQty: "1,790",
    estimateQty: "1,850",
    diff: "−60",
    pctDiff: "−3.2%",
    confidence: 61,
    planSheets: "C-601",
    spec: "84-2",
    statusLabel: "Low AI confidence",
    statusColor: "amber",
    attention: true,
    filters: ["low-confidence"],
    explanation:
      "Source markings partially obscured on C-601; AI extraction confidence is low. Verify manually.",
  },
  {
    id: 13,
    description: "Roadside Sign (One Post)",
    unit: "EA",
    officialQty: "14",
    aiQty: "15",
    estimateQty: "14",
    diff: "+1",
    pctDiff: "+7.1%",
    confidence: 82,
    planSheets: "C-601, C-602",
    spec: "56-2",
    statusLabel: "Plan conflict — RFI drafted",
    statusColor: "amber",
    attention: false,
    filters: ["matched"],
    explanation:
      "Sign schedule on C-602 shows 15 posts; plan callouts on C-601 show 14. RFI drafted for clarification.",
  },
  {
    id: 14,
    description: "Erosion Control (Hydroseed)",
    unit: "SF",
    officialQty: "45,000",
    aiQty: "45,000",
    estimateQty: "45,000",
    diff: "0",
    pctDiff: "0%",
    confidence: 91,
    planSheets: "C-801",
    spec: "21-1",
    statusLabel: "Match",
    statusColor: "green",
    attention: false,
    filters: ["matched"],
  },
  {
    id: 15,
    description: "Minor Concrete (Curb & Gutter)",
    unit: "LF",
    officialQty: "2,150",
    aiQty: "2,150",
    estimateQty: "—",
    diff: "—",
    pctDiff: "—",
    confidence: 95,
    planSheets: "C-401",
    spec: "73-2",
    statusLabel: "MISSING FROM ESTIMATE",
    statusColor: "red",
    attention: true,
    filters: ["missing"],
    addable: true,
    explanation:
      "This official bid item was not found in your estimate. Add it to keep your bid responsive.",
  },
]

export const statusColorClasses: Record<StatusColor, string> = {
  green: "border-transparent bg-success/10 text-success",
  amber: "border-transparent bg-warning/15 text-warning",
  yellow: "border-transparent bg-caution/15 text-caution",
  red: "border-transparent bg-destructive/10 text-destructive",
}

export const filterChips: {
  key: FilterKey
  label: string
  color: StatusColor | "neutral"
}[] = [
  { key: "all", label: "All", color: "neutral" },
  { key: "matched", label: "Matched", color: "green" },
  { key: "quantity-discrepancy", label: "Quantity Discrepancy", color: "amber" },
  { key: "low-confidence", label: "Low AI Confidence", color: "amber" },
  { key: "missing", label: "Missing From Estimate", color: "red" },
  { key: "lump-sum", label: "Lump Sum — Verify", color: "yellow" },
  { key: "unit-converted", label: "Unit Converted", color: "yellow" },
]
