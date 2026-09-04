import type { projects } from "@/db/schema"
import type { DashboardProject, ProjectsListItem } from "@/lib/mock-data"
import { withProjectQuery } from "@/lib/project-scope"

type ProjectRow = typeof projects.$inferSelect
export type StatusTone = "success" | "warning" | "primary" | "muted" | "review"

// label/tone are the canonical status vocabulary shown everywhere a project
// status appears (dashboard, /projects, sidebar) — keep them in sync with
// the homepage's honest-framing rules: no "AI Processing" wording that
// implies live AI work is happening behind the prototype banner.
const STATUS_META: Record<
  ProjectRow["status"],
  { label: string; tone: StatusTone; href: string; buttonLabel: string }
> = {
  draft: {
    label: "Draft",
    tone: "muted",
    href: "/upload",
    buttonLabel: "Continue Setup",
  },
  documents: {
    label: "Documents uploaded",
    tone: "muted",
    href: "/upload",
    buttonLabel: "Continue Setup",
  },
  processing: {
    label: "Processing",
    tone: "review",
    href: "/processing",
    buttonLabel: "View Processing",
  },
  ready: {
    label: "Bid ready",
    tone: "success",
    href: "/intelligence",
    buttonLabel: "Open Project",
  },
  estimating: {
    label: "Estimating",
    tone: "primary",
    href: "/estimate",
    buttonLabel: "Open Estimate",
  },
  reconciliation: {
    label: "Reconciliation — needs review",
    tone: "warning",
    href: "/reconciliation",
    buttonLabel: "Review Reconciliation",
  },
}

function parseDate(bidDate: string | null): Date | null {
  if (!bidDate) return null
  const date = new Date(`${bidDate}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatCurrency(value: string | null): string {
  const n = value == null ? NaN : Number(value)
  if (Number.isNaN(n)) return "—"
  return `$${Math.round(n).toLocaleString("en-US")}`
}

function formatBidDate(bidDate: string | null): string {
  const date = parseDate(bidDate)
  if (!date) return "—"
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDeadlineDate(bidDate: string | null): string {
  const date = parseDate(bidDate)
  if (!date) return "— —"
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function computeDaysOut(bidDate: string | null): number {
  const date = parseDate(bidDate)
  if (!date) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((date.getTime() - today.getTime()) / 86_400_000))
}

// Soonest bid date first; projects with no bid date sort last.
export function sortByBidDate(rows: ProjectRow[]): ProjectRow[] {
  return [...rows].sort((a, b) => {
    if (!a.bidDate && !b.bidDate) return 0
    if (!a.bidDate) return 1
    if (!b.bidDate) return -1
    return a.bidDate.localeCompare(b.bidDate)
  })
}

function hrefFor(meta: { href: string }, projectId: string): string {
  return withProjectQuery(meta.href, projectId)
}

export function toDashboardProject(row: ProjectRow): DashboardProject {
  const meta = STATUS_META[row.status] ?? STATUS_META.draft
  return {
    id: row.id,
    name: row.name,
    number: row.number,
    owner: row.owner,
    bidDate: formatBidDate(row.bidDate),
    engineersEstimate: formatCurrency(row.engineersEstimate),
    status: row.status,
    statusLabel: meta.label,
    href: hrefFor(meta, row.id),
    deadlineDate: formatDeadlineDate(row.bidDate),
    daysOut: computeDaysOut(row.bidDate),
  }
}

export function toProjectListItem(row: ProjectRow): ProjectsListItem {
  const meta = STATUS_META[row.status]
  return {
    id: row.id,
    name: row.name,
    number: row.number,
    owner: row.owner,
    status: meta.label,
    statusTone: meta.tone,
    bidDate: formatBidDate(row.bidDate),
    buttonLabel: meta.buttonLabel,
    href: hrefFor(meta, row.id),
    isProjectScoped: true,
  }
}
