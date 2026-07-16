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

export const homeValueCards = [
  {
    title: "Upload plans, specs, and bid forms",
    description:
      "Bring the full bid package into one place so estimators start from the same source documents.",
  },
  {
    title: "Extract schedules and bid requirements",
    description:
      "Pull bid schedules, working days, bonds, and other requirements out of plans and specs.",
  },
  {
    title: "Build estimates using company labor/equipment rates",
    description:
      "Apply your crew rates, equipment costs, markups, and production defaults consistently.",
  },
  {
    title: "Reconcile against the official bid form",
    description:
      "Compare estimate items to the agency bid form so missing or mismatched items surface early.",
  },
  {
    title: "Request optional human review",
    description:
      "Send flagged items to a reviewer when quantities, scope, or risk need a second set of eyes.",
  },
  {
    title: "Export PDF/Excel reports",
    description:
      "Deliver professional estimate, reconciliation, and proposal-ready reports for bid day.",
  },
]

export const homeHowItWorks = [
  { step: 1, title: "Create Project", description: "Capture agency, bid date, and project basics." },
  { step: 2, title: "Upload Documents", description: "Add plans, specs, addenda, and the official bid form." },
  { step: 3, title: "AI Reviews Plans & Specs", description: "Constimator reads the package and extracts key data." },
  { step: 4, title: "Set Company Cost Rates", description: "Confirm labor, equipment, markups, and indirects." },
  { step: 5, title: "Build Estimate", description: "Organize quantities, crews, and pricing in one workspace." },
  { step: 6, title: "Reconcile Bid Form", description: "Match your estimate to the official bid schedule." },
  { step: 7, title: "Review & Export Reports", description: "Resolve flags, get review, and export bid packages." },
]

export const homeWhyContractorsCare = [
  {
    title: "Faster bid turnaround",
    description:
      "Spend less time hunting through plan sheets and more time pricing work that wins jobs.",
  },
  {
    title: "Fewer missed bid items",
    description:
      "Reconciliation against the official bid form helps catch missing pay items before submittal.",
  },
  {
    title: "Quantity discrepancy detection",
    description:
      "Surface mismatches between schedules, takeoffs, and the agency form while there is still time to fix them.",
  },
  {
    title: "Better estimate organization",
    description:
      "Keep documents, schedules, costs, and review notes connected for every project.",
  },
  {
    title: "Professional reporting",
    description:
      "Export clean PDF and Excel reports that look ready for OPS, partners, and bid day packages.",
  },
]
