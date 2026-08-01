import Link from "next/link"
import { FolderKanban, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { getScopedDb } from "@/lib/db/scoped"
import { sortByBidDate, toProjectListItem } from "@/lib/projects"
import { cn } from "@/lib/utils"

const toneStyles = {
  success: "border-transparent bg-success/15 text-success",
  warning: "border-transparent bg-warning/15 text-warning",
  primary: "border-transparent bg-primary/15 text-primary",
  muted: "border-transparent bg-muted text-muted-foreground",
  review: "border-transparent bg-review/15 text-review",
} as const

export default async function ProjectsPage() {
  const scopedDb = await getScopedDb()
  const rows = await scopedDb.projects.findMany()
  const projectsList = sortByBidDate(rows).map(toProjectListItem)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Active bids and estimating work.
          </p>
        </div>
        <Button render={<Link href="/projects/new" />}>
          <Plus data-icon="inline-start" />
          New Project
        </Button>
      </div>

      {projectsList.length === 0 ? (
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
            <Button render={<Link href="/projects/new" />}>
              <Plus data-icon="inline-start" />
              New Project
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projectsList.map((project) => (
            <Card key={project.id} className="flex flex-col">
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base leading-snug">
                      {project.name}
                    </CardTitle>
                    <CardDescription>
                      #{project.number} · {project.owner}
                    </CardDescription>
                  </div>
                  <Badge className={cn(toneStyles[project.statusTone])}>
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Bid Date</span>
                  <span className="font-medium tabular-nums">{project.bidDate}</span>
                </div>
                {project.discrepancies != null ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Discrepancies</span>
                    <span className="font-medium tabular-nums text-warning">
                      {project.discrepancies}
                    </span>
                  </div>
                ) : null}
                {project.reports ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Reports</span>
                    <span className="font-medium text-success">{project.reports}</span>
                  </div>
                ) : null}
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant="outline"
                  render={<Link href={project.href} />}
                >
                  {project.buttonLabel}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
