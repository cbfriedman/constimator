"use client"

import * as React from "react"
import { AlertTriangle, Pin } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useProjectState } from "@/components/project-state-provider"

/**
 * The single company-rate change surfaced in the drift banner and diff table.
 * Display copy only — totals are never recomputed from these values.
 */
const driftChange = {
  rate: "Operator — Group 3",
  summary: "Operator Grp 3 +$1.75/hr",
  snapshot: "$88.10/hr",
  current: "$89.85/hr",
}

export function RateSnapshotChip() {
  const { rateSnapshotDate, triggerRateDrift, rateDrift, recalculated } =
    useProjectState()

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
            This estimate uses the rates captured when it was created. Company
            rate changes don&apos;t affect it unless you recalculate.
          </TooltipContent>
        </Tooltip>
        {!rateDrift && !recalculated ? (
          <button
            type="button"
            onClick={triggerRateDrift}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Simulate rate change (demo)
          </button>
        ) : null}
      </div>
    </TooltipProvider>
  )
}

export function RateDriftBanner() {
  const {
    rateSnapshotDate,
    rateDrift,
    driftDismissed,
    dismissDrift,
    recalculate,
  } = useProjectState()
  const [viewOpen, setViewOpen] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  if (!rateDrift || driftDismissed) return null

  function handleRecalculate() {
    recalculate()
    setConfirmOpen(false)
    toast.success("Estimate recalculated — rate snapshot updated")
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b border-warning/40 bg-warning/10 px-6 py-3">
        <AlertTriangle className="size-4 shrink-0 text-warning" />
        <p className="flex-1 text-sm text-foreground">
          <span className="font-medium">
            Company rates have changed since this estimate&apos;s snapshot
          </span>{" "}
          (1 change: {driftChange.summary}).
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-warning/40 bg-warning/10 text-warning hover:bg-warning/20"
            onClick={() => setViewOpen(true)}
          >
            View Changes
          </Button>
          <Button size="sm" variant="outline" onClick={dismissDrift}>
            Keep Snapshot
          </Button>
          <Button size="sm" onClick={() => setConfirmOpen(true)}>
            Recalculate with Current Rates
          </Button>
        </div>
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate changes since snapshot</DialogTitle>
            <DialogDescription>
              Company-default rates that changed after this estimate&apos;s
              snapshot ({rateSnapshotDate}).
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rate</TableHead>
                  <TableHead className="text-right">
                    Snapshot (Jul 9)
                  </TableHead>
                  <TableHead className="text-right">Current</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-foreground">
                    {driftChange.rate}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {driftChange.snapshot}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-foreground">
                    {driftChange.current}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Close</Button>} />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recalculate with current rates?</DialogTitle>
            <DialogDescription>
              This updates the estimate to today&apos;s rates and records the
              change in revision history. Approved or exported estimates cannot
              be recalculated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button onClick={handleRecalculate}>
              Recalculate with Current Rates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
