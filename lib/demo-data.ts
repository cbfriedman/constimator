export const demoProject = {
  name: "Shasta County Roadway Improvements",
  owner: "Shasta County Public Works",
  number: "24-118",
  bidDateFull: "Friday, August 22, 2026",
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
  company: "Torres Grading & Paving Inc.",
  initials: "MT",
}

export type ProjectStatus = "reconciliation" | "estimating" | "documents"

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

export const dashboardProjects: DashboardProject[] = [
  {
    id: "shasta",
    name: "Shasta County Roadway Improvements",
    number: "24-118",
    owner: "Shasta County Public Works",
    bidDate: "Aug 22, 2026",
    engineersEstimate: "$1,850,000",
    status: "reconciliation",
    statusLabel: "Reconciliation — 3 items flagged",
    href: "/intelligence",
    deadlineDate: "Aug 22",
    daysOut: 42,
  },
  {
    id: "anderson",
    name: "Anderson Water Main Replacement",
    number: "25-042",
    owner: "City of Anderson",
    bidDate: "Sep 4, 2026",
    engineersEstimate: "$920,000",
    status: "estimating",
    statusLabel: "Estimating",
    href: null,
    deadlineDate: "Sep 4",
    daysOut: 55,
  },
  {
    id: "redding",
    name: "Redding Airport Apron Rehab",
    number: "25-107",
    owner: "City of Redding",
    bidDate: "Sep 18, 2026",
    engineersEstimate: "$3,400,000",
    status: "documents",
    statusLabel: "Documents uploaded",
    href: null,
    deadlineDate: "Sep 18",
    daysOut: 69,
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
