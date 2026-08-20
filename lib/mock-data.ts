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
  statusTone: "success" | "warning" | "primary" | "muted" | "review"
  bidDate: string
  discrepancies?: number
  reports?: string
  buttonLabel: string
  href: string
  // Whether href points somewhere that looks up this exact project (true)
  // vs. a page that only ever shows the org's "current" (most recently
  // created) project regardless of which id is in the URL — see
  // lib/projects.ts's PROJECT_SCOPED_PATHS.
  isProjectScoped: boolean
}

// recentActivity used to live here and was rendered on every org's
// dashboard regardless of whose data it described. The panel now derives
// its entries from the signed-in org's own rows — see lib/activity.ts.

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

