import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const stages = [
  { label: "Not requested", state: "done" },
  { label: "Requested", state: "done" },
  { label: "Assigned", state: "done" },
  { label: "In review", state: "active" },
  { label: "Changes requested", state: "upcoming" },
  { label: "Approved", state: "upcoming" },
] as const

export function StatusPipeline() {
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {stages.map((stage, index) => (
        <div key={stage.label} className="flex items-center gap-1">
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              stage.state === "done" &&
                "border-success/30 bg-success/10 text-success",
              stage.state === "active" &&
                "border-primary bg-primary text-primary-foreground",
              stage.state === "upcoming" &&
                "border-border bg-muted/40 text-muted-foreground",
            )}
          >
            {stage.state === "done" ? <Check className="size-3" /> : null}
            {stage.label}
          </span>
          {index < stages.length - 1 ? (
            <span aria-hidden className="text-muted-foreground">
              ›
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}
