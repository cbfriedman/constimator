"use client"

import { Check } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { costSetupSections, type CostSetupSectionId } from "@/lib/cost-setup-data"
import { cn } from "@/lib/utils"

export function SectionNav({
  activeId,
  completeIds,
  completeCount,
  onSelect,
}: {
  activeId: CostSetupSectionId
  completeIds: Set<CostSetupSectionId>
  completeCount: number
  onSelect: (id: CostSetupSectionId) => void
}) {
  return (
    <nav
      aria-label="Cost setup sections"
      className="flex flex-col gap-3 lg:sticky lg:top-6"
    >
      <Badge
        variant="outline"
        className={cn(
          "w-fit gap-1.5 font-medium",
          completeCount === costSetupSections.length
            ? "border-transparent bg-primary/10 text-primary"
            : "border-warning/60 bg-warning/10 text-warning",
        )}
      >
        {completeCount} of {costSetupSections.length} sections complete
      </Badge>

      <ul className="flex flex-col gap-0.5">
        {costSetupSections.map((section, index) => {
          const isComplete = completeIds.has(section.id)
          const isActive = activeId === section.id
          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onSelect(section.id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  isActive
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border text-xs",
                    isComplete
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-warning/60 text-warning",
                  )}
                  aria-hidden="true"
                >
                  {isComplete ? (
                    <Check className="size-3.5" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-warning" />
                  )}
                </span>
                <span className="flex-1">{section.label}</span>
                <span className="text-xs tabular-nums text-muted-foreground/70">
                  {index + 1}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
