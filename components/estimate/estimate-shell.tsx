"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Plus } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { BidCountdownBadge } from "@/components/bid-countdown-badge"
import { Button } from "@/components/ui/button"
import { useProjectState } from "@/components/project-state-provider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { EstimateTable } from "@/components/estimate/estimate-table"
import {
  EstimateLineDialog,
  type EstimateLineFormValue,
} from "@/components/estimate/estimate-line-dialog"
import {
  RateDriftBanner,
  RateSnapshotChip,
} from "@/components/estimate/rate-snapshot"
import {
  addEstimateLineAction,
  deleteEstimateLineAction,
  setEstimateMarkupAction,
  updateEstimateLineAction,
} from "@/app/estimate/actions"
import type { EstimateLineView } from "@/lib/estimate-view"

const markupLabels: Record<string, string> = {
  "10": "Markup: 10% (all items)",
  "12": "Markup: 12% (all items)",
  "15": "Markup: 15% (all items)",
  custom: "Markup: Custom per item",
}

const filterLabels: Record<string, string> = {
  all: "Filter: All statuses",
  official: "Filter: Official",
  reviewed: "Filter: Reviewed",
  manual: "Filter: Manual",
  overridden: "Filter: Overridden",
}

export function EstimateShell({
  projectId,
  projectName,
  rows: initialRows,
  subtotal,
  markup,
  markupPct,
  bidTotal,
  vsEngineersEstimatePct,
}: {
  projectId: string
  projectName: string
  rows: EstimateLineView[]
  subtotal: string
  markup: string
  markupPct: number
  bidTotal: string
  vsEngineersEstimatePct: number | null
}) {
  const router = useRouter()
  const { costSetupComplete } = useProjectState()
  const [rows, setRows] = useState(initialRows)
  const [prevInitialRows, setPrevInitialRows] = useState(initialRows)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<EstimateLineFormValue | undefined>(undefined)
  const [filter, setFilter] = useState("all")

  if (initialRows !== prevInitialRows) {
    setPrevInitialRows(initialRows)
    setRows(initialRows)
  }

  const filteredRows =
    filter === "all" ? rows : rows.filter((row) => row.source === filter)

  const totals = [
    { label: "Subtotal", value: subtotal },
    { label: `Markup (${Math.round(markupPct)}%)`, value: markup },
    { label: "Bid Total", value: bidTotal, emphasized: true },
  ]

  function handleMarkupChange(value: string | null) {
    if (!value || value === "custom") return
    const pct = Number(value)
    if (!Number.isFinite(pct)) return
    setRows((prev) => prev.map((row) => ({ ...row, mu: value })))
    setEstimateMarkupAction(projectId, pct)
      .then(() => router.refresh())
      .catch(() => toast.error("Couldn't update markup — try again."))
  }

  function openAdd() {
    setEditing(undefined)
    setDialogOpen(true)
  }

  function openEdit(row: EstimateLineView) {
    setEditing({ id: row.id, ...row.raw })
    setDialogOpen(true)
  }

  async function handleSave(value: EstimateLineFormValue) {
    setDialogOpen(false)
    if (value.id) {
      const updated = await updateEstimateLineAction(value.id, value).catch(() => null)
      if (updated) {
        toast.success(`Updated ${value.description}`)
        router.refresh()
      } else {
        toast.error("Couldn't save that — try again.")
      }
    } else {
      const created = await addEstimateLineAction(projectId, value).catch(() => null)
      if (created) {
        toast.success(`Added ${value.description}`)
        router.refresh()
      } else {
        toast.error("Couldn't save that — try again.")
      }
    }
  }

  function handleDuplicate(row: EstimateLineView) {
    addEstimateLineAction(projectId, { ...row.raw, description: `${row.raw.description} (copy)` })
      .then(() => {
        toast.success(`Duplicated ${row.description}`)
        router.refresh()
      })
      .catch(() => toast.error("Couldn't duplicate that — try again."))
  }

  function handleDelete(row: EstimateLineView) {
    setRows((prev) => prev.filter((r) => r.id !== row.id))
    deleteEstimateLineAction(row.id)
      .then(() => {
        toast(`Removed ${row.description}`)
        router.refresh()
      })
      .catch(() => toast.error("Couldn't remove that — try again."))
  }

  return (
    <div className="flex flex-col">
      {!costSetupComplete ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-warning/40 bg-warning/10 px-6 py-3">
          <AlertTriangle className="size-4 shrink-0 text-warning" />
          <p className="flex-1 text-sm text-foreground">
            <span className="font-medium">
              2 cost settings are missing
            </span>{" "}
            (Cement Mason labor rate, Water Truck rate, Insurance %). Totals
            shown are preliminary.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-warning/40 bg-warning/10 text-warning hover:bg-warning/20"
            onClick={() => router.push("/cost-setup")}
          >
            Complete Cost Setup
          </Button>
        </div>
      ) : null}
      <RateDriftBanner />
      <div className="flex flex-col gap-4 border-b bg-card px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Estimate Workspace
              </h1>
              <BidCountdownBadge />
            </div>
            <p className="text-sm text-muted-foreground">{projectName}</p>
            <RateSnapshotChip />
          </div>
          <div className="flex items-center gap-4">
            {totals.map((item) => (
              <div key={item.label} className="flex flex-col items-end">
                <span className="text-xs text-muted-foreground">
                  {item.label}
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className={
                      item.emphasized
                        ? "text-lg font-bold text-foreground tabular-nums"
                        : "text-sm font-medium text-foreground tabular-nums"
                    }
                  >
                    {item.value}
                  </span>
                  {item.emphasized && !costSetupComplete ? (
                    <Badge
                      variant="outline"
                      className="border-warning/40 bg-warning/10 text-warning"
                    >
                      Preliminary
                    </Badge>
                  ) : null}
                </span>
              </div>
            ))}
            {vsEngineersEstimatePct != null ? (
              <>
                <Separator orientation="vertical" className="h-10" />
                <Badge
                  variant="outline"
                  className="border-warning/40 bg-warning/10 text-warning"
                >
                  vs. Engineer&apos;s Estimate: {vsEngineersEstimatePct >= 0 ? "+" : ""}
                  {vsEngineersEstimatePct.toFixed(1)}%
                </Badge>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={openAdd} disabled={!projectId}>
            <Plus data-icon="inline-start" />
            Add Line Item
          </Button>
          <Select defaultValue="10" onValueChange={handleMarkupChange}>
            <SelectTrigger size="sm" className="w-52">
              <SelectValue>{(value) => markupLabels[value as string]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">Markup: 10% (all items)</SelectItem>
              <SelectItem value="12">Markup: 12% (all items)</SelectItem>
              <SelectItem value="15">Markup: 15% (all items)</SelectItem>
              <SelectItem value="custom">Markup: Custom per item</SelectItem>
            </SelectContent>
          </Select>
          <Select
            defaultValue="all"
            onValueChange={(value) => setFilter(value ?? "all")}
          >
            <SelectTrigger size="sm" className="w-48">
              <SelectValue>{(value) => filterLabels[value as string]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Filter: All statuses</SelectItem>
              <SelectItem value="official">Filter: Official</SelectItem>
              <SelectItem value="reviewed">Filter: Reviewed</SelectItem>
              <SelectItem value="manual">Filter: Manual</SelectItem>
              <SelectItem value="overridden">Filter: Overridden</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="ml-auto"
            onClick={() => router.push("/reconciliation")}
          >
            Reconcile Against Bid Form
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-6">
        <EstimateTable
          rows={filteredRows}
          onEdit={openEdit}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        />
        <p className="text-right text-xs text-muted-foreground">
          All changes saved
        </p>
      </div>

      <EstimateLineDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialValue={editing}
        onSave={handleSave}
      />
    </div>
  )
}
