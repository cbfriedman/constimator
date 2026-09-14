"use client"

import { AlertTriangle, Pin } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useProjectState } from "@/components/project-state-provider"

/**
 * Rate snapshot chip and the drift banner.
 *
 * What this used to do, and why it doesn't any more:
 *
 *  - A "Recalculate with Current Rates" button opened a confirm dialog,
 *    called recalculateAction, and toasted "Estimate recalculated — rate
 *    snapshot updated". recalculateAction wrote four flags and recomputed
 *    nothing (see lib/project-state-actions.ts). So the app correctly told a
 *    contractor their estimate was stale, offered to fix it, said it had, and
 *    hadn't — on the screen where they decide what number to submit.
 *  - A "View Changes" dialog showed a rate diff table. Every row was a
 *    hardcoded constant ("Operator Grp 3 +$1.75/hr, $88.10 -> $89.85"),
 *    displayed regardless of which rate had actually changed. There is no
 *    rate-history table to build a real diff from — lib/cost-engine/drift.ts
 *    compares one timestamp and yields a boolean, nothing more.
 *  - A "Simulate rate change (demo)" link shipped in the authenticated
 *    estimate workspace.
 *
 * All three are gone. What's left is the part that was real: drift detection,
 * an honest banner saying the estimate still uses its snapshot rates, and
 * "Keep Snapshot" to dismiss. Re-pricing is a manual line edit, which is what
 * it always actually was.
 *
 * If a real recalculation is wanted later it needs (a) per-line provenance of
 * which cost_item each price came from and (b) rate history to diff against.
 * Neither exists in the schema today, and both are a bigger change than a
 * button.
 */
export function RateSnapshotChip() {
  const { rateSnapshotDate } = useProjectState()

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Badge
                variant="outline"
                className="cursor-default gap-1.5 border-border bg-muted/50 text-muted-foreground"
              />
            }
          >
            <Pin className="size-3" />
            Rates snapshot — {rateSnapshotDate}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            This estimate uses the rates captured when it was created. Changing
            a company rate later doesn&apos;t change this estimate — edit the
            affected lines to re-price them.
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

export function RateDriftBanner() {
  const { rateSnapshotDate, rateDrift, driftDismissed, dismissDrift } =
    useProjectState()

  if (!rateDrift || driftDismissed) return null

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-warning/40 bg-warning/10 px-6 py-3">
      <AlertTriangle className="size-4 shrink-0 text-warning" />
      <p className="flex-1 text-sm text-foreground">
        <span className="font-medium">
          Company rates have changed since this estimate&apos;s snapshot
        </span>{" "}
        ({rateSnapshotDate}). This estimate still uses its snapshot rates —
        review the affected lines and re-enter their prices if you want the
        current ones.
      </p>
      <Button size="sm" variant="outline" onClick={dismissDrift}>
        Keep Snapshot
      </Button>
    </div>
  )
}
