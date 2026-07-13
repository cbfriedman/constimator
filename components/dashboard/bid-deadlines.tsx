import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardProject } from "@/lib/demo-data"

export function BidDeadlines({ projects }: { projects: DashboardProject[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Bid Deadlines</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0"
          >
            <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-md border bg-muted/50 text-center leading-none">
              <span className="text-[10px] font-medium uppercase text-muted-foreground">
                {project.deadlineDate.split(" ")[0]}
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {project.deadlineDate.split(" ")[1]}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-tight">
                {project.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {project.daysOut} days out
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
