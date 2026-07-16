"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Plus, CalendarClock, Flag, UserCheck, FolderKanban } from "lucide-react"
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
import {
  dashboardProjects,
  recentActivity,
  type DashboardProject,
} from "@/lib/demo-data"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { ProjectsTable } from "@/components/dashboard/projects-table"
import { BidDeadlines } from "@/components/dashboard/bid-deadlines"
import { RecentActivity } from "@/components/dashboard/recent-activity"

function DashboardHeader({ onNewProject }: { onNewProject: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your active bids and estimating activity.
        </p>
      </div>
      <Button onClick={onNewProject}>
        <Plus data-icon="inline-start" />
        New Project
      </Button>
    </div>
  )
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEmpty = searchParams.get("empty") === "1"

  function handleProjectClick(project: DashboardProject) {
    if (project.href) {
      router.push(project.href)
    } else {
      toast("Demo limited to the Shasta County project.")
    }
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <DashboardHeader onNewProject={() => router.push("/new-project")} />
        <Empty className="min-h-[60vh] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderKanban />
            </EmptyMedia>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>
              Upload your first plan set and let Constimator do the reading.
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

  const summaryCards = [
    {
      label: "Active Projects",
      value: "3",
      subtitle: "$6.17M in total bids",
      icon: CalendarClock,
      href: null,
    },
    {
      label: "Bids Due This Week",
      value: "0",
      subtitle: "Next: Shasta County — 42 days",
      icon: CalendarClock,
      href: null,
    },
    {
      label: "Items Flagged for Review",
      value: "3",
      subtitle: "Quantity flags on 1 project",
      icon: Flag,
      href: "/reconciliation",
      tone: "warning" as const,
    },
    {
      label: "Human Review",
      value: "1 in review",
      subtitle: "Dan Whitfield, P.E.",
      icon: UserCheck,
      href: "/review",
      tone: "review" as const,
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <DashboardHeader onNewProject={() => router.push("/new-project")} />

      <SummaryCards cards={summaryCards} onNavigate={(href) => router.push(href)} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ProjectsTable
            projects={dashboardProjects}
            onProjectClick={handleProjectClick}
          />
          <RecentActivity items={recentActivity} />
        </div>
        <div className="lg:col-span-1">
          <BidDeadlines projects={dashboardProjects} />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  )
}
