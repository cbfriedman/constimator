"use client"

import { useRouter } from "next/navigation"
import { Check, Flag, PencilLine } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { statusColorClasses } from "@/lib/reconciliation-data"
import type { ReconciliationRowView } from "@/lib/reconciliation-view"
import { acceptOfficialQuantityAction } from "@/app/reconciliation/actions"
import { overrideEstimateLineAction } from "@/app/estimate/actions"

function QtyTile({
  label,
  value,
  unit,
  variant,
}: {
  label: string
  value: string
  unit: string
  variant: "official" | "estimate"
}) {
  const styles = {
    official: "border-2 border-primary bg-primary/5 text-primary",
    estimate: "border bg-muted/40 text-foreground",
  }[variant]

  return (
    <div className={cn("flex flex-col gap-1 rounded-lg p-3", styles)}>
      <span className="text-xs font-medium uppercase tracking-wide opacity-80">
        {label}
      </span>
      <span className="text-lg font-bold tabular-nums">
        {value}
        {value !== "—" ? (
          <span className="ml-1 text-xs font-normal opacity-70">{unit}</span>
        ) : null}
      </span>
    </div>
  )
}

export function DetailSheet({
  row,
  open,
  onOpenChange,
}: {
  row: ReconciliationRowView | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()

  if (!row) return null

  const hasEstimateLine = row.estimateLineId != null

  async function handleAcceptOfficial() {
    if (!row!.estimateLineId) return
    onOpenChange(false)
    toast.success(`Estimate line updated to the official quantity for ${row!.description}`)
    await acceptOfficialQuantityAction(row!.estimateLineId, row!.bidId).catch(() => {
      toast.error("Couldn't save that — try again.")
    })
  }

  async function handleKeepMine() {
    if (!row!.estimateLineId) return
    onOpenChange(false)
    toast(`Kept your quantity for ${row!.description}`)
    await overrideEstimateLineAction(row!.estimateLineId).catch(() => {
      toast.error("Couldn't save that — try again.")
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              Item {row.itemNumber}
            </span>
            <Badge
              variant="outline"
              className={cn("font-medium", statusColorClasses[row.statusColor])}
            >
              {row.statusLabel}
            </Badge>
          </div>
          <SheetTitle>{row.description}</SheetTitle>
          <SheetDescription>
            Unit {row.unit} · Spec {row.spec}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 p-4">
          <div className="grid grid-cols-2 gap-2">
            <QtyTile
              label="Official"
              value={row.officialQty}
              unit={row.unit}
              variant="official"
            />
            <QtyTile
              label="Estimate"
              value={row.estimateQty}
              unit={row.unit}
              variant="estimate"
            />
          </div>

          {row.explanation ? (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm leading-relaxed text-foreground">
                {row.explanation}
              </p>
            </div>
          ) : null}
        </div>

        <SheetFooter className="border-t">
          {hasEstimateLine ? (
            <>
              <Button onClick={handleAcceptOfficial}>
                <Check data-icon="inline-start" />
                Accept Official Quantity
              </Button>
              <Button variant="outline" onClick={handleKeepMine}>
                <PencilLine data-icon="inline-start" />
                Keep My Quantity (Override)
              </Button>
            </>
          ) : null}
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              router.push("/review")
            }}
          >
            <Flag data-icon="inline-start" />
            Flag for Human Review
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
