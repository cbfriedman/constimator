import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DashboardProject } from "@/lib/mock-data"

export function BidDeadlines({ projects }: { projects: DashboardProject[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Bid Deadlines</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {projects.map((project, index) => {
          const isNearest = index === 0
          const isUrgent = project.daysOut < 7
          const isSoon = project.daysOut < 14

          return (
            <div
              key={project.id}
              className={cn(
                "flex items-start gap-3 rounded-md border-b pb-3 last:border-0 last:pb-0",
                isNearest && "border-b-0",
              )}
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 flex-col items-center justify-center rounded-md border text-center leading-none",
                  isUrgent
                    ? "border-destructive/30 bg-destructive/10"
                    : isSoon
                      ? "border-warning/30 bg-warning/10"
                      : "bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase text-muted-foreground",
                    isUrgent && "text-destructive",
                    isSoon && !isUrgent && "text-warning",
                  )}
                >
                  {project.deadlineDate.split(" ")[0]}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    isUrgent && "text-destructive",
                    isSoon && !isUrgent && "text-warning",
                  )}
                >
                  {project.deadlineDate.split(" ")[1]}
                </span>
              </div>
              <div className="flex flex-col">
                <span
                  className={cn(
                    "text-sm leading-tight",
                    isNearest ? "font-semibold" : "font-medium",
                  )}
                >
                  {project.name}
                </span>
                <span
                  className={cn(
                    "text-xs text-muted-foreground",
                    isUrgent && "text-destructive",
                  )}
                >
                  {project.daysOut} days out
                </span>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
