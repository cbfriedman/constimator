import { CalendarClock, ExternalLink, FileQuestion } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SourceChip } from "@/components/intelligence/source-reference"
import type {
  ExtractedItemView,
  IntelligenceProjectView,
  ParticipationGoalView,
  SpecLinkView,
} from "@/app/intelligence/actions"

export function OverviewTab({
  project,
  items,
  participationGoals,
  specLinks,
  specsAnalyzed,
}: {
  project: IntelligenceProjectView
  items: ExtractedItemView[]
  participationGoals: ParticipationGoalView[]
  specLinks: SpecLinkView[]
  specsAnalyzed: boolean
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
    // One tile per programme the specs name — a job can carry a DBE goal and
    // a DVBE goal at once, and they are separate obligations. "Stated, no
    // percentage" is the specs imposing a requirement without setting a
    // number (see ParticipationGoalView); the verbatim clause under the grid
    // is what says which kind it is.
    ...participationGoals.map((goal) => ({
      label: `${goal.program} Goal`,
      value: goal.goal ?? "Stated, no percentage",
    })),
    // Only claim the specs set no goal once the specs have actually been
    // read. Before that the honest answer is silence, not "none".
    specsAnalyzed &&
      participationGoals.length === 0 && {
        label: "Participation Goal",
        value: "None in the specs",
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
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {keyFacts.map((fact, i) => (
                <div
                  // Indexed because two goal tiles can share a label — the
                  // specs naming the same programme twice is the agency's
                  // doing, not something to drop on the floor.
                  key={`${fact.label}-${i}`}
                  className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3"
                >
                  <span className="text-xs text-muted-foreground">{fact.label}</span>
                  <span className="text-sm font-semibold text-foreground">{fact.value}</span>
                </div>
              ))}
            </div>

            {participationGoals.length > 0 || specLinks.length > 0 ? (
              <div className="flex flex-col gap-3 border-t pt-4">
                {participationGoals.map((goal, i) => (
                  <div key={`${goal.program}-${i}`} className="flex flex-col gap-1">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {/* The clause verbatim. A percentage a bidder can't
                          check against the specs in one glance is a
                          percentage they'll go and look up anyway. */}
                      &ldquo;{goal.rawText}&rdquo;
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <SourceChip
                        label={
                          goal.sourcePage != null
                            ? `${goal.documentName} p.${goal.sourcePage}`
                            : goal.documentName
                        }
                      />
                      {goal.appliesTo ? (
                        <span className="text-xs text-muted-foreground">{goal.appliesTo}</span>
                      ) : null}
                    </div>
                    {goal.notes ? (
                      <p className="text-xs text-muted-foreground">{goal.notes}</p>
                    ) : null}
                  </div>
                ))}

                {specLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit max-w-full items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="size-3.5 shrink-0" />
                    <span className="truncate">{link.label}</span>
                  </a>
                ))}
              </div>
            ) : null}
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
