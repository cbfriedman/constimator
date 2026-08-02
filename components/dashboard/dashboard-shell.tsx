"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { FileBarChart, Flag, FolderKanban, Plus, Timer } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { ProjectsTable } from "@/components/dashboard/projects-table"
import { BidDeadlines } from "@/components/dashboard/bid-deadlines"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { useProjectState } from "@/components/project-state-provider"
import { recentActivity, type DashboardProject } from "@/lib/mock-data"

// engineersEstimate/deadlineDate arrive pre-formatted (lib/projects.ts) —
// parse back out just enough to total and sort them here.
function totalBidsLabel(projects: DashboardProject[]): string {
  const total = projects.reduce((sum, p) => {
    const n = Number(p.engineersEstimate.replace(/[^0-9.]/g, ""))
    return sum + (Number.isNaN(n) ? 0 : n)
  }, 0)
  if (total === 0) return "No engineer's estimates yet"
  return total >= 1_000_000
    ? `$${(total / 1_000_000).toFixed(2)}M in bids`
    : `$${total.toLocaleString("en-US")} in bids`
}

function nearestDeadline(projects: DashboardProject[]): DashboardProject | null {
  const withDates = projects.filter((p) => p.deadlineDate !== "— —")
  if (withDates.length === 0) return null
  return [...withDates].sort((a, b) => a.daysOut - b.daysOut)[0]
}

function DashboardHeader() {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">Your bids</h1>
      <p className="text-sm text-muted-foreground">
        Every project you&apos;re working, and what needs your attention
        before bid day.
      </p>
    </div>
  )
}

function DashboardContent({
  projects,
  currentProjectId,
}: {
  projects: DashboardProject[]
  currentProjectId: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { attentionCount } = useProjectState()
  const isEmpty = searchParams.get("empty") === "1" || projects.length === 0

  // cost-setup/estimate/reconciliation/reports/schedules aren't project-
  // scoped yet (see lib/current-project.ts) — they always operate on the
  // org's most-recently-created project. Clicking any other row would land
  // on pages showing a different project's data, so only the current one
  // navigates for real.
  function handleProjectClick(project: DashboardProject) {
    if (project.id === currentProjectId) {
      router.push(project.href ?? "/intelligence")
      return
    }
    toast.info(
      "This project isn't wired up yet — Constimator currently works with your most recently created project.",
    )
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <DashboardHeader />
        <Empty className="min-h-[60vh] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderKanban />
            </EmptyMedia>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>
              Upload your first plan set and bid form, and Constimator will
              read them and help you reconcile your estimate before bid day.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => router.push("/new-project")}>
              <Plus data-icon="inline-start" />
              New Project
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  const nearest = nearestDeadline(projects)
  const urgentTone =
    nearest && nearest.daysOut < 7
      ? ("danger" as const)
      : nearest && nearest.daysOut < 14
        ? ("warning" as const)
        : undefined

  const summaryCards = [
    {
      label: "Active Projects",
      value: String(projects.length),
      subtitle: totalBidsLabel(projects),
      icon: FolderKanban,
      href: "/projects",
    },
    {
      label: "Next Bid Deadline",
      value: nearest ? String(nearest.daysOut) : "—",
      subtitle: nearest
        ? `${nearest.name} — ${nearest.daysOut} days out`
        : "No upcoming deadlines",
      icon: Timer,
      href: null,
      tone: urgentTone,
    },
    {
      label: "Items Flagged in Reconciliation",
      value: String(attentionCount),
      subtitle: "Across 1 project — needs review",
      icon: Flag,
      href: "/reconciliation",
      tone: "warning" as const,
    },
    {
      label: "Reports Ready",
      value: "2",
      subtitle: "Estimate + reconciliation exports available",
      icon: FileBarChart,
      href: "/reports",
      tone: "review" as const,
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <DashboardHeader />

      <SummaryCards
        cards={summaryCards}
        onNavigate={(href) => router.push(href)}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ProjectsTable
            projects={projects}
            currentProjectId={currentProjectId}
            onProjectClick={handleProjectClick}
            onNewProject={() => router.push("/new-project")}
          />
          <RecentActivity items={recentActivity} />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-1">
          <BidDeadlines projects={projects} />
        </div>
      </div>
    </div>
  )
}

export function DashboardShell({
  projects,
  currentProjectId,
}: {
  projects: DashboardProject[]
  currentProjectId: string | null
}) {
  return (
    <Suspense fallback={null}>
      <DashboardContent
        projects={projects}
        currentProjectId={currentProjectId}
      />
    </Suspense>
  )
}
