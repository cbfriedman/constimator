"use client"

import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { DashboardProject } from "@/lib/mock-data"

const statusStyles: Record<DashboardProject["status"], string> = {
  reconciliation: "border-transparent bg-warning/15 text-warning",
  estimating: "border-transparent bg-primary/15 text-primary",
  documents: "border-transparent bg-muted text-muted-foreground",
  ready: "border-transparent bg-success/15 text-success",
  processing: "border-transparent bg-review/15 text-review",
  draft: "border-transparent bg-muted text-muted-foreground",
}

export function ProjectsTable({
  projects,
  onProjectClick,
  onNewProject,
}: {
  projects: DashboardProject[]
  onProjectClick: (project: DashboardProject) => void
  onNewProject: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Projects</CardTitle>
        <CardAction>
          <Button size="sm" onClick={onNewProject}>
            <Plus data-icon="inline-start" />
            New Project
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[26%]">Project</TableHead>
              <TableHead className="w-[20%]">Owner</TableHead>
              <TableHead className="w-[14%]">Bid Date</TableHead>
              <TableHead className="w-[16%] text-right">Engineer&apos;s Est.</TableHead>
              <TableHead className="w-[24%]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow
                key={project.id}
                onClick={() => onProjectClick(project)}
                className="cursor-pointer"
              >
                <TableCell className="whitespace-normal">
                  <div className="flex flex-col">
                    <span className="font-medium leading-tight">{project.name}</span>
                    <span className="text-xs text-muted-foreground">
                      #{project.number}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">
                  {project.owner}
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {project.bidDate}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {project.engineersEstimate}
                </TableCell>
                <TableCell className="whitespace-normal">
                  <Badge
                    className={cn(
                      "h-auto items-start whitespace-normal py-1 text-left font-normal leading-tight",
                      statusStyles[project.status],
                    )}
                  >
                    {project.statusLabel}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
