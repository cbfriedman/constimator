"use client"

import { useRouter } from "next/navigation"
import { Check, FileText, Flag, PencilLine } from "lucide-react"
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
import {
  type ReconRow,
  statusColorClasses,
} from "@/lib/reconciliation-data"

function QtyTile({
  label,
  value,
  unit,
  variant,
}: {
  label: string
  value: string
  unit: string
  variant: "official" | "ai" | "estimate"
}) {
  const styles = {
    official: "border-2 border-primary bg-primary/5 text-primary",
    ai: "border-2 border-warning bg-warning/5 text-warning",
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

function ExcerptBox({ caption }: { caption: string }) {
  return (
    <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/40 p-4 text-center">
      <FileText className="size-6 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{caption}</span>
    </div>
  )
}

export function DetailSheet({
  row,
  open,
  onOpenChange,
}: {
  row: ReconRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()

  if (!row) return null

  const bidFormPage = "p.4"
  const planSheet = row.planSheets !== "—" ? row.planSheets.split(",")[0].trim() : "C-301"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              Item {row.id}
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
            Unit {row.unit} · Plan {row.planSheets} · Spec {row.spec}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 p-4">
          <div className="grid grid-cols-3 gap-2">
            <QtyTile
              label="Official"
              value={row.officialQty}
              unit={row.unit}
              variant="official"
            />
            <QtyTile
              label="AI"
              value={row.aiQty}
              unit={row.unit}
              variant="ai"
            />
            <QtyTile
              label="Estimate"
              value={row.estimateQty}
              unit={row.unit}
              variant="estimate"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ExcerptBox caption={`Bid form excerpt — ${bidFormPage}`} />
            <ExcerptBox caption={`Plan sheet excerpt — ${planSheet}`} />
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
          <Button
            onClick={() => {
              toast.success(`Official quantity accepted for ${row.description}`)
              onOpenChange(false)
            }}
          >
            <Check data-icon="inline-start" />
            Accept Official Quantity
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              toast(`Kept your quantity for ${row.description}`)
              onOpenChange(false)
            }}
          >
            <PencilLine data-icon="inline-start" />
            Keep My Quantity (Override)
          </Button>
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
