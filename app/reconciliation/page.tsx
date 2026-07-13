"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, FileBarChart, Plus, UserCheck } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DetailSheet } from "@/components/reconciliation/detail-sheet"
import { ReconTable } from "@/components/reconciliation/recon-table"
import { cn } from "@/lib/utils"
import {
  type FilterKey,
  type ReconRow,
  type StatusColor,
  filterChips,
  reconciliationRows,
} from "@/lib/reconciliation-data"

const chipColorClasses: Record<StatusColor | "neutral", string> = {
  neutral:
    "data-[active=true]:border-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground",
  green:
    "text-success data-[active=true]:border-success data-[active=true]:bg-success data-[active=true]:text-success-foreground",
  amber:
    "text-warning data-[active=true]:border-warning data-[active=true]:bg-warning data-[active=true]:text-warning-foreground",
  yellow:
    "text-caution data-[active=true]:border-caution data-[active=true]:bg-caution data-[active=true]:text-caution-foreground",
  red: "text-destructive data-[active=true]:border-destructive data-[active=true]:bg-destructive data-[active=true]:text-destructive-foreground",
}

export default function ReconciliationPage() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all")
  const [item15Added, setItem15Added] = useState(false)
  const [selectedRow, setSelectedRow] = useState<ReconRow | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const rows = useMemo<ReconRow[]>(() => {
    return reconciliationRows.map((row) => {
      if (row.id === 15 && item15Added) {
        return {
          ...row,
          estimateQty: "2,150",
          diff: "0",
          pctDiff: "0%",
          statusLabel: "Match — added to estimate",
          statusColor: "green",
          attention: false,
          filters: ["matched"],
          addable: false,
        }
      }
      return row
    })
  }, [item15Added])

  const attentionCount = rows.filter((r) => r.attention).length
  const matchedCount = rows.filter((r) => !r.attention).length
  const missingCount = rows.filter((r) => r.statusColor === "red").length

  const filteredRows =
    activeFilter === "all"
      ? rows
      : rows.filter((r) => r.filters.includes(activeFilter))

  const chipCount = (key: FilterKey) => {
    if (key === "all") return rows.length
    return rows.filter((r) => r.filters.includes(key)).length
  }

  function handleAddItem15() {
    setItem15Added(true)
    toast.success("Item 15 added to estimate — $124,700 at $58.00/LF")
  }

  function handleRowClick(row: ReconRow) {
    setSelectedRow(row)
    setSheetOpen(true)
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Bid Form Reconciliation
          </h1>
          <p className="text-sm text-muted-foreground">
            Shasta County Roadway Improvements · #24-118
          </p>
        </div>

        {/* Result banner */}
        <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold text-foreground">
              Reconciliation Result:
            </span>
            <span
              className={cn(
                "font-semibold",
                attentionCount > 0 ? "text-warning" : "text-success",
              )}
            >
              {attentionCount} items need attention
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="font-semibold text-success">
              {matchedCount} items match
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterChips.map((chip) => {
              const active = activeFilter === chip.key
              return (
                <button
                  key={chip.key}
                  type="button"
                  data-active={active}
                  onClick={() => setActiveFilter(chip.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    "hover:bg-muted",
                    chipColorClasses[chip.color],
                  )}
                >
                  {chip.label}
                  <span className="tabular-nums opacity-80">
                    ({chipCount(chip.key)})
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <ReconTable
          rows={filteredRows}
          onRowClick={handleRowClick}
          onAddItem15={handleAddItem15}
        />

        {/* Missing item warning */}
        {missingCount > 0 ? (
          <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <p className="text-sm text-foreground">
                <span className="font-semibold text-destructive">
                  {missingCount} official bid item is missing from your estimate.
                </span>{" "}
                Bids submitted with missing items are non-responsive.
              </p>
            </div>
            <Button className="shrink-0" onClick={handleAddItem15}>
              <Plus data-icon="inline-start" />
              Add Item 15 to Estimate
            </Button>
          </div>
        ) : null}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Button variant="outline" onClick={() => router.push("/review")}>
            <UserCheck data-icon="inline-start" />
            Request Human Review
          </Button>
          <Button onClick={() => router.push("/reports")}>
            <FileBarChart data-icon="inline-start" />
            Generate Reports
          </Button>
        </div>
      </div>

      <DetailSheet
        row={selectedRow}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </TooltipProvider>
  )
}
