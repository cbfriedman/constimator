import { CalendarClock, FileQuestion } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SourceChip } from "@/components/intelligence/source-reference"
import type { ExtractedItemView, IntelligenceProjectView } from "@/app/intelligence/actions"

export function OverviewTab({
  project,
  items,
}: {
  project: IntelligenceProjectView
  items: ExtractedItemView[]
}) {
  const keyFacts = [
    project.workingDays != null && { label: "Working Days", value: String(project.workingDays) },
    project.liquidatedDamagesPerDay && {
      label: "Liquidated Damages",
      value: project.liquidatedDamagesPerDay,
    },
    { label: "Prevailing Wage", value: project.prevailingWage ? "Required" : "Not required" },
    project.engineersEstimate && {
      label: "Engineer's Estimate",
      value: project.engineersEstimate,
    },
  ].filter(Boolean) as { label: string; value: string }[]

  const scopeItems = items.filter((item) => item.quantity > 0)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="leading-relaxed text-foreground">
            {project.name} · #{project.number}
          </p>
          <p className="leading-relaxed text-muted-foreground">
            {project.owner}
            {project.location ? ` · ${project.location}` : ""}
            {project.projectType ? ` · ${project.projectType}` : ""}
          </p>
          {project.bidDate ? (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarClock className="size-3.5" />
              Bid due {project.bidDate}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {keyFacts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Key Facts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {keyFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3"
                >
                  <span className="text-xs text-muted-foreground">{fact.label}</span>
                  <span className="text-sm font-semibold text-foreground">{fact.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Major Scope Items</CardTitle>
          <CardDescription>
            From documents processed so far — see the Schedules & Tables tab
            for the full extracted list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scopeItems.length > 0 ? (
            <ul className="flex flex-col divide-y">
              {scopeItems.slice(0, 8).map((item, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="text-sm text-foreground">
                    {item.description} — {item.quantity.toLocaleString("en-US")} {item.unit}
                  </span>
                  {item.sourceSheets ? (
                    <SourceChip label={item.sourceSheets} />
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileQuestion className="size-4 shrink-0" />
              No scope items extracted yet — upload documents and check back
              once AI processing finishes.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
