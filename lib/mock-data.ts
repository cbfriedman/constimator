import type { SourceKind } from "@/components/source-badge"

export const demoProject = {
  name: "Shasta County Roadway Improvements",
  owner: "Shasta County Public Works",
  number: "24-118",
  bidDateFull: "Friday, August 22, 2026",
  bidDateShort: "Aug 22, 2026",
  bidTime: "2:00 PM PT",
  engineersEstimate: "$1,850,000",
  type: "Civil / Roadway / Public Works",
  location: "Shasta County, CA",
  prevailingWage: true,
  workingDays: 60,
  liquidatedDamages: "$2,500/day",
}

export const demoUser = {
  name: "Mike Torres",
  firstName: "Mike",
  company: "Torres Grading & Paving Inc.",
  initials: "MT",
}

export type ProjectStatus =
  | "reconciliation"
  | "estimating"
  | "documents"
  | "ready"
  | "processing"
  | "draft"

export type DashboardProject = {
  id: string
  name: string
  number: string
  owner: string
  bidDate: string
  engineersEstimate: string
  status: ProjectStatus
  statusLabel: string
  href: string | null
  deadlineDate: string
  daysOut: number
}

export type ProjectsListItem = {
  id: string
  name: string
  number: string
  owner: string
  status: string
  statusTone: "success" | "warning" | "muted" | "review"
  bidDate: string
  discrepancies?: number
  reports?: string
  buttonLabel: string
  href: string
}

export const projectsList: ProjectsListItem[] = [
  {
    id: "shasta",
    name: "Shasta County Roadway Improvements",
    number: "24-118",
    owner: "Shasta County Public Works",
    status: "Ready for Estimate",
    statusTone: "success",
    bidDate: "Aug 22, 2026",
    discrepancies: 3,
    reports: "Ready",
    buttonLabel: "Open Project",
    href: "/intelligence",
  },
  {
    id: "north-valley",
    name: "North Valley Drainage Improvements",
    number: "25-061",
    owner: "Tehama County Public Works",
    status: "AI Processing",
    statusTone: "review",
    bidDate: "Sep 5, 2026",
    buttonLabel: "View Processing",
    href: "/processing",
  },
  {
    id: "sierra",
    name: "Sierra School Parking Lot Overlay",
    number: "25-088",
    owner: "Sierra Unified School District",
    status: "Draft",
    statusTone: "muted",
    bidDate: "Sep 12, 2026",
    buttonLabel: "Continue Setup",
    href: "/upload",
  },
]

export const dashboardProjects: DashboardProject[] = [
  {
    id: "shasta",
    name: "Shasta County Roadway Improvements",
    number: "24-118",
    owner: "Shasta County Public Works",
    bidDate: "Aug 22, 2026",
    engineersEstimate: "$1,850,000",
    status: "ready",
    statusLabel: "Ready for Estimate",
    href: "/intelligence",
    deadlineDate: "Aug 22",
    daysOut: 38,
  },
  {
    id: "north-valley",
    name: "North Valley Drainage Improvements",
    number: "25-061",
    owner: "Tehama County Public Works",
    bidDate: "Sep 5, 2026",
    engineersEstimate: "$1,120,000",
    status: "processing",
    statusLabel: "AI Processing",
    href: "/processing",
    deadlineDate: "Sep 5",
    daysOut: 52,
  },
  {
    id: "sierra",
    name: "Sierra School Parking Lot Overlay",
    number: "25-088",
    owner: "Sierra Unified School District",
    bidDate: "Sep 12, 2026",
    engineersEstimate: "$480,000",
    status: "draft",
    statusLabel: "Draft",
    href: "/upload",
    deadlineDate: "Sep 12",
    daysOut: 59,
  },
]

export const recentActivity = [
  {
    text: "Addendum 01 analyzed — HMA quantity revised +250 TON",
    date: "Jul 10",
  },
  { text: "Human review requested — 3 flagged items", date: "Jul 10" },
  {
    text: "AI analysis complete — 15 bid items, 6 schedules, 4 risks",
    date: "Jul 9",
  },
]

export const demoFlowSteps = [
  { step: 1, label: "Review Project Intelligence", href: "/intelligence" },
  { step: 2, label: "Check Cost Setup", href: "/cost-setup" },
  { step: 3, label: "Open Estimate Workspace", href: "/estimate" },
  { step: 4, label: "Reconcile Bid Form", href: "/reconciliation" },
  { step: 5, label: "Export Reports", href: "/reports" },
]

export const opsDemoPath = [
  "Start at Home Page",
  "Show contractor value proposition",
  "Open Dashboard",
  "Open Shasta project",
  "Show AI Project Intelligence",
  "Show Company Cost Setup",
  "Show Estimate Workspace",
  "Show Bid Form Reconciliation",
  "Show Human Review",
  "Show Reports",
]

export const processingStages = [
  "Validating documents",
  "Checking file types and page counts",
  "Extracting text from specifications",
  "Rendering plan sheets",
  "Detecting schedules and tables",
  "Reading official bid form",
  "Extracting bid requirements",
  "Generating project intelligence",
  "Preparing bid form reconciliation",
]

export const processingSummary = [
  { label: "Plans", value: "64 sheets processed" },
  { label: "Specifications", value: "412 pages processed" },
  { label: "Bid Form", value: "15 items extracted" },
  { label: "Addenda", value: "1 addendum applied" },
  { label: "Issues Found", value: "3 items need review", tone: "warning" as const },
]

export const homeProblems = [
  {
    title: "Plans, specs, addenda, and bid forms are scattered",
    description:
      "Bid packages arrive as dozens of separate files with no single source of truth before bid day.",
  },
  {
    title: "Important bid requirements are easy to miss",
    description:
      "Bonds, liquidated damages, prevailing wage, and working-day limits get buried in specification sections.",
  },
  {
    title: "Quantities may not match the official bid schedule",
    description:
      "Estimates built from takeoffs and plan sheets can drift from the agency's bid form without anyone noticing.",
  },
  {
    title: "Company labor and equipment rates must be applied consistently",
    description:
      "Crew, equipment, markup, and overhead rates need to be applied the same way on every bid item, every time.",
  },
  {
    title: "Final reports need to be clear and defensible",
    description:
      "Proposal packages need to show where every number came from to hold up under scrutiny.",
  },
]

export const homeSolutionSteps = [
  {
    step: 1,
    description: "Upload plans, specifications, addenda, and the official bid form.",
    linkLabel: "Upload Documents",
    href: "/upload",
  },
  {
    step: 2,
    description:
      "AI extracts project intelligence, schedules, risks, and bid requirements.",
    linkLabel: "Project Intelligence",
    href: "/intelligence",
  },
  {
    step: 3,
    description:
      "Contractor applies company labor, equipment, markup, bond, and overhead rates.",
    linkLabel: "Cost Setup",
    href: "/cost-setup",
  },
  {
    step: 4,
    description: "Estimate workspace organizes bid items, quantities, and pricing.",
    linkLabel: "Estimate Workspace",
    href: "/estimate",
  },
  {
    step: 5,
    description:
      "Bid reconciliation compares official quantities, AI quantities, and estimate quantities.",
    linkLabel: "Bid Reconciliation",
    href: "/reconciliation",
  },
]

export const homeDifferentiatorFlags = [
  "Missing bid items",
  "Quantity discrepancies",
  "Unit mismatches",
  "Lump sum items requiring manual review",
  "Low-confidence AI extractions",
  "Items needing human review",
]

export const homeCostSetupItems = [
  "Labor rates",
  "Equipment rates",
  "Bond premium",
  "Overhead",
  "Profit",
  "Insurance",
  "Markups",
  "Project-specific overrides",
]

export const homeReportProvenance: { kind: SourceKind; description: string }[] = [
  {
    kind: "official",
    description: "Straight from the agency's official bid schedule.",
  },
  {
    kind: "ai-extracted",
    description: "Pulled from plans, specs, and schedules by Constimator.",
  },
  {
    kind: "manual",
    description: "Entered directly by the contractor in the estimate.",
  },
  {
    kind: "reviewed",
    description: "Confirmed by a human reviewer before export.",
  },
  {
    kind: "overridden",
    description: "Manually replaces an extracted or official quantity.",
  },
]

export const homeDemoPath = [
  "Start from this homepage",
  "Launch Contractor Demo",
  "Open Shasta County Roadway Improvements",
  "Review AI Project Intelligence",
  "Check Cost Setup",
  "Open Estimate Workspace",
  "Show Bid Form Reconciliation",
  "Request Human Review",
  "Export Reports",
]
