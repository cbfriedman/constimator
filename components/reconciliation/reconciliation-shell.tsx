"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  FileBarChart,
  FileUp,
  Lock,
  SlidersHorizontal,
  UserCheck,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DetailSheet } from "@/components/reconciliation/detail-sheet"
import { ReconTable } from "@/components/reconciliation/recon-table"
import { ProjectHeader } from "@/components/project-header"
import { cn } from "@/lib/utils"
import { type FilterKey, type StatusColor, filterChips } from "@/lib/reconciliation-data"
import type { ReconciliationRowView } from "@/lib/reconciliation-view"
import { addMissingItemToEstimateAction } from "@/app/reconciliation/actions"

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

export function ReconciliationShell({
  projectName,
  initialRows,
}: {
  projectName: string
  initialRows: ReconciliationRowView[]
}) {
  const router = useRouter()
  const [rows, setRows] = useState<ReconciliationRowView[]>(initialRows)
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all")
  const [selectedRow, setSelectedRow] = useState<ReconciliationRowView | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [demoState, setDemoState] = useState<"ready" | "no-bid-form">("ready")

  const attentionCount = rows.filter((r) => r.attention).length
  const matchedCount = rows.filter((r) => !r.attention).length
  const missingCount = rows.filter((r) => r.statusColor === "red").length

  const filteredRows = useMemo(
    () =>
      activeFilter === "all"
        ? rows
        : rows.filter((r) => r.filters.includes(activeFilter)),
    [rows, activeFilter],
  )

  const chipCount = (key: FilterKey) => {
    if (key === "all") return rows.length
    return rows.filter((r) => r.filters.includes(key)).length
  }

  async function handleAddToEstimate(row: ReconciliationRowView) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              estimateQty: r.officialQty,
              diff: "0",
              pctDiff: "0%",
              statusLabel: "Match — added to estimate",
              statusColor: "green",
              attention: false,
              filters: ["matched"],
              addable: false,
            }
          : r,
      ),
    )
    toast.success(`${row.description} added to estimate`)
    await addMissingItemToEstimateAction(row.id).catch(() => {
      toast.error("Couldn't save that — try again.")
    })
  }

  function handleRowClick(row: ReconciliationRowView) {
    setSelectedRow(row)
    setSheetOpen(true)
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-6">
        <ProjectHeader
          title="Bid Form Reconciliation"
          subtitle={projectName}
          actions={
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                  />
                }
              >
                <SlidersHorizontal data-icon="inline-start" />
                Demo states
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuRadioGroup
                  value={demoState}
                  onValueChange={(value) =>
                    setDemoState(value as "ready" | "no-bid-form")
                  }
                >
                  <DropdownMenuLabel>Preview state</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioItem value="ready">
                    Reconciliation ready
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="no-bid-form">
                    No bid form uploaded
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />

        {demoState === "no-bid-form" ? (
          <Empty className="min-h-[60vh] border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Lock />
              </EmptyMedia>
              <EmptyTitle>Reconciliation locked</EmptyTitle>
              <EmptyDescription>
                Upload the Official Bid Form to unlock reconciliation.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => router.push("/upload")}>
                <FileUp data-icon="inline-start" />
                Upload the Official Bid Form
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
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
              onAddToEstimate={handleAddToEstimate}
            />

            {missingCount > 0 ? (
              <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
                  <p className="text-sm text-foreground">
                    <span className="font-semibold text-destructive">
                      {missingCount} official bid{" "}
                      {missingCount === 1 ? "item is" : "items are"} missing
                      from your estimate.
                    </span>{" "}
                    Bids submitted with missing items are non-responsive.
                  </p>
                </div>
              </div>
            ) : null}

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
          </>
        )}
      </div>

      <DetailSheet row={selectedRow} open={sheetOpen} onOpenChange={setSheetOpen} />
    </TooltipProvider>
  )
}
