"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowRight,
  FileBarChart,
  Flag,
  FolderKanban,
  ListOrdered,
  Plus,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import {
  dashboardProjects,
  demoFlowSteps,
  demoProject,
  demoUser,
  recentActivity,
  type DashboardProject,
} from "@/lib/mock-data"

function DashboardHeader({ onNewProject }: { onNewProject: () => void }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {demoUser.firstName}
        </h1>
        <p className="text-sm text-muted-foreground">{demoUser.company}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" render={<Link href="/demo-guide" />}>
          OPS Demo Guide
        </Button>
        <Button onClick={onNewProject}>
          <Plus data-icon="inline-start" />
          New Project
        </Button>
      </div>
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
    }
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <DashboardHeader onNewProject={() => router.push("/projects/new")} />
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
            <Button onClick={() => router.push("/projects/new")}>
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
      subtitle: "Across public works & school bids",
      icon: FolderKanban,
      href: "/projects",
    },
    {
      label: "Estimates in Progress",
      value: "2",
      subtitle: "Shasta + North Valley",
      icon: ListOrdered,
      href: "/estimate",
    },
    {
      label: "Bid Discrepancies Found",
      value: "3",
      subtitle: "On Shasta County project",
      icon: Flag,
      href: "/reconciliation",
      tone: "warning" as const,
    },
    {
      label: "Reports Ready",
      value: "1",
      subtitle: "Shasta export package",
      icon: FileBarChart,
      href: "/reports",
      tone: "review" as const,
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <DashboardHeader onNewProject={() => router.push("/projects/new")} />

      <SummaryCards
        cards={summaryCards}
        onNavigate={(href) => router.push(href)}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-primary/25 bg-primary/[0.03] xl:col-span-2">
          <CardHeader className="gap-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl">{demoProject.name}</CardTitle>
                <CardDescription className="mt-1">
                  Primary demo project for OPS walkthrough
                </CardDescription>
              </div>
              <span className="inline-flex items-center rounded-md bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
                Ready for Estimate
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Agency</span>
                <span className="text-sm font-medium">{demoProject.owner}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Bid Date</span>
                <span className="text-sm font-medium tabular-nums">
                  {demoProject.bidDateShort}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  Engineer&apos;s Estimate
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {demoProject.engineersEstimate}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Status</span>
                <span className="text-sm font-medium">Ready for Estimate</span>
              </div>
            </div>
            <div>
              <Button onClick={() => router.push("/intelligence")}>
                Open Demo Project
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demo Flow</CardTitle>
            <CardDescription>
              Recommended path through the Shasta project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3">
              {demoFlowSteps.map((item) => (
                <li key={item.step}>
                  <button
                    type="button"
                    onClick={() => router.push(item.href)}
                    className="flex w-full items-start gap-3 rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-border hover:bg-muted/50"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {item.step}
                    </span>
                    <span className="pt-0.5 text-sm font-medium leading-snug">
                      {item.label}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ProjectsTable
            projects={dashboardProjects}
            onProjectClick={handleProjectClick}
          />
          <RecentActivity items={recentActivity} />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-1">
          <BidDeadlines projects={dashboardProjects} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Recommended Demo Path for OPS
              </CardTitle>
              <CardDescription>
                Full presenter checklist from home through reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                render={<Link href="/demo-guide" />}
              >
                Open Demo Guide
              </Button>
            </CardContent>
          </Card>
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
