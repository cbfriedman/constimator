"use client"

import { Badge } from "@/components/ui/badge"
import { useProjectState } from "@/components/project-state-provider"
import { cn } from "@/lib/utils"

/**
 * Shared "N days to bid" countdown chip, reading the real days-until-bid
 * for the current project (lib/project-state-actions.ts) so it never
 * drifts out of sync with the dashboard's own deadline card again.
 * Single source of truth so every project page renders it identically.
 */
export function BidCountdownBadge({ className }: { className?: string }) {
  const { currentProjectDaysOut } = useProjectState()

  if (currentProjectDaysOut === null) return null

  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 border-warning/40 bg-warning/10 text-warning",
        className,
      )}
    >
      {currentProjectDaysOut} {currentProjectDaysOut === 1 ? "day" : "days"} to bid
    </Badge>
  )
}
