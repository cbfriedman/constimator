import { CalendarDays, CheckCircle2, FileBarChart, Flag } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { SourceBadge } from "@/components/source-badge"
import { estimateRows } from "@/lib/estimate-data"
import { demoProject } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const previewRowIds = [1, 6, 8]
const previewRows = estimateRows.filter((row) => previewRowIds.includes(row.id))

const stats = [
  { icon: CalendarDays, label: "Bid Date", value: demoProject.bidDateShort },
  {
    icon: CheckCircle2,
    label: "AI Processing",
    value: "Complete",
    tone: "success" as const,
  },
  {
    icon: Flag,
    label: "Bid Discrepancies",
    value: "3",
    tone: "warning" as const,
  },
  {
    icon: FileBarChart,
    label: "Reports Ready",
    value: "1",
    tone: "review" as const,
  },
]

const toneClasses = {
  success: "text-success",
  warning: "text-warning",
  review: "text-review",
}

export function ProductPreviewCard() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2rem] bg-primary/10 blur-3xl"
      />
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl ring-1 ring-foreground/5">
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-3">
          <span className="size-2.5 rounded-full bg-destructive/30" />
          <span className="size-2.5 rounded-full bg-warning/40" />
          <span className="size-2.5 rounded-full bg-success/40" />
          <span className="ml-2.5 truncate text-xs font-medium text-muted-foreground">
            Estimate Workspace
          </span>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {demoProject.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {demoProject.owner} · #{demoProject.number}
              </p>
            </div>
            <Badge className="shrink-0 border-transparent bg-success/15 text-success">
              Ready for Estimate
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col gap-1 rounded-lg bg-muted/50 px-3 py-2"
              >
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <stat.icon className="size-3" />
                  {stat.label}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums text-foreground",
                    stat.tone && toneClasses[stat.tone],
                  )}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            {previewRows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 text-xs last:border-b-0"
              >
                <span className="truncate font-medium text-foreground">
                  {row.description}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <SourceBadge kind={row.source} />
                  <span className="tabular-nums font-medium text-foreground">
                    {row.total}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs font-medium text-muted-foreground">
              Total Bid Amount
            </span>
            <span className="text-xl font-bold tabular-nums text-foreground">
              $1,916,585
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
