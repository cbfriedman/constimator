"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  EyeOff,
  FilePlus,
  FileQuestion,
  Link2,
  Loader2,
  MessageSquareWarning,
  Undo2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { LinkCalloutDialog } from "@/components/reconciliation/link-callout-dialog"
import { RfiDraftDialog } from "@/components/reconciliation/rfi-draft-dialog"
import { ProjectHeader } from "@/components/project-header"
import {
  dismissCalloutAction,
  linkCalloutAction,
  recordRfiDraftedAction,
  setEstimatorQuantityAction,
  type SheetMatrixData,
} from "@/app/reconciliation/sheets/actions"
import { statusColorClasses } from "@/lib/reconciliation-data"
import {
  formatPct,
  formatQty,
  formatSignedQty,
  type CellStatus,
  type ItemStatus,
  type ItemSummary,
  type SheetMatrixCell,
} from "@/lib/sheet-matrix"
import { cn } from "@/lib/utils"

type StatusColor = keyof typeof statusColorClasses

const CELL_STATUS: Record<CellStatus, { label: string; color: StatusColor }> = {
  match: { label: "Matches bid form", color: "green" },
  discrepancy: { label: "Differs from bid form", color: "amber" },
  unlinked: { label: "Not on bid form", color: "red" },
  lump_sum: { label: "Lump sum — no quantity to compare", color: "yellow" },
}

const ITEM_STATUS: Record<ItemStatus, { label: string; color: StatusColor }> = {
  match: { label: "All sheets agree", color: "green" },
  discrepancy: { label: "A sheet differs", color: "amber" },
  no_callouts: { label: "No sheet states a quantity", color: "yellow" },
  lump_sum: { label: "Lump sum", color: "yellow" },
}

const SOURCE_KIND_LABEL: Record<string, string> = {
  schedule: "Schedule",
  summary: "Summary of quantities",
  note: "General note",
  callout: "Callout",
  profile: "Profile",
  other: "Sheet",
}

function StatusBadge({ label, color }: { label: string; color: StatusColor }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-auto whitespace-normal py-1 text-left font-medium leading-tight",
        statusColorClasses[color],
      )}
    >
      {label}
    </Badge>
  )
}

function SourceText({ cell }: { cell: SheetMatrixCell }) {
  return (
    <Tooltip>
      <TooltipTrigger className="max-w-64 cursor-help truncate text-left text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="font-medium text-foreground/80">
          {SOURCE_KIND_LABEL[cell.sourceKind] ?? "Sheet"}
        </span>
        {" · "}
        {cell.sourceText}
      </TooltipTrigger>
      <TooltipContent className="max-w-sm whitespace-pre-wrap">
        <p>{cell.sourceText}</p>
        {cell.notes ? <p className="mt-1 opacity-80">Note: {cell.notes}</p> : null}
        {cell.confidence != null ? (
          <p className="mt-1 opacity-80">Extraction confidence {Math.round(cell.confidence)}%</p>
        ) : null}
        {cell.pageNumber != null ? (
          <p className="mt-1 opacity-80">
            {cell.documentName} · page {cell.pageNumber}
          </p>
        ) : null}
      </TooltipContent>
    </Tooltip>
  )
}

// Inline, commit-on-blur. The value lives on the estimate line, so what's
// typed here shows up priced in /estimate and diffed on /reconciliation.
function EstimatorQtyCell({
  item,
  onCommit,
}: {
  item: ItemSummary
  onCommit: (item: ItemSummary, quantity: string) => Promise<void>
}) {
  const initial = item.estimateQty == null ? "" : String(item.estimateQty)
  const [value, setValue] = React.useState(initial)
  const [prevInitial, setPrevInitial] = React.useState(initial)
  const [saving, setSaving] = React.useState(false)

  if (initial !== prevInitial) {
    setPrevInitial(initial)
    setValue(initial)
  }

  async function commit() {
    const trimmed = value.trim()
    if (trimmed === "" || trimmed === initial) {
      setValue(initial)
      return
    }
    if (!Number.isFinite(Number(trimmed))) {
      toast.error("Enter a number.")
      setValue(initial)
      return
    }
    setSaving(true)
    try {
      await onCommit(item, trimmed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {saving ? <Loader2 className="size-3 animate-spin text-muted-foreground" /> : null}
      <Input
        aria-label={`Your quantity for ${item.description}`}
        type="number"
        step="0.01"
        inputMode="decimal"
        placeholder="—"
        className="h-8 w-28 text-right tabular-nums"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
          if (e.key === "Escape") setValue(initial)
        }}
      />
    </div>
  )
}

function CellActions({
  cell,
  onRfi,
  onLink,
  onDismiss,
}: {
  cell: SheetMatrixCell
  onRfi: (cell: SheetMatrixCell) => void
  onLink: (cell: SheetMatrixCell) => void
  onDismiss: (cell: SheetMatrixCell) => void
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {cell.status === "discrepancy" || cell.status === "unlinked" ? (
        <Button size="sm" variant="outline" onClick={() => onRfi(cell)}>
          <MessageSquareWarning data-icon="inline-start" />
          Draft RFI
        </Button>
      ) : null}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button size="icon-sm" variant="ghost" aria-label="Link to a bid item" onClick={() => onLink(cell)} />
          }
        >
          <Link2 />
        </TooltipTrigger>
        <TooltipContent>
          {cell.bidId ? "Change which bid item this is for" : "Link to a bid item"}
          {cell.matchSource ? ` (linked by ${cell.matchSource === "ai" ? "AI" : cell.matchSource === "description" ? "description match" : "you"})` : ""}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button size="icon-sm" variant="ghost" aria-label="Dismiss this row" onClick={() => onDismiss(cell)} />
          }
        >
          <EyeOff />
        </TooltipTrigger>
        <TooltipContent>Dismiss — not a quantity, or not this project&apos;s</TooltipContent>
      </Tooltip>
    </div>
  )
}

function toCsv(cells: SheetMatrixCell[], itemsById: Map<string, ItemSummary>): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const header = [
    "Sheet",
    "Sheet Title",
    "Bid Item #",
    "Description",
    "Unit",
    "Official Qty",
    "Stated on Sheet",
    "AI Takeoff Qty",
    "Estimator Qty",
    "Diff",
    "% Diff",
    "Status",
    "Source",
    "Source Text",
    "Document",
  ]
  const rows = cells.map((cell) => {
    const item = cell.bidId ? itemsById.get(cell.bidId) : undefined
    return [
      cell.sheetNumber,
      cell.sheetTitle ?? "",
      cell.itemNumber ?? "",
      cell.description,
      cell.unit,
      cell.officialQty == null ? "" : String(cell.officialQty),
      String(cell.statedQty),
      item?.aiTakeoffQty == null ? "" : String(item.aiTakeoffQty),
      item?.estimateQty == null ? "" : String(item.estimateQty),
      cell.diffQty == null ? "" : String(cell.diffQty),
      cell.diffPct == null ? "" : cell.diffPct.toFixed(1),
      CELL_STATUS[cell.status].label,
      SOURCE_KIND_LABEL[cell.sourceKind] ?? cell.sourceKind,
      cell.sourceText,
      cell.documentName,
    ]
  })
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n")
}

export function SheetMatrixShell({ data }: { data: SheetMatrixData }) {
  const router = useRouter()
  const { project, matrix } = data
  const [rfiCell, setRfiCell] = React.useState<SheetMatrixCell | null>(null)
  const [rfiOpen, setRfiOpen] = React.useState(false)
  const [linkCell, setLinkCell] = React.useState<SheetMatrixCell | null>(null)
  const [linkOpen, setLinkOpen] = React.useState(false)
  const [showDismissed, setShowDismissed] = React.useState(false)

  const itemsById = React.useMemo(
    () => new Map((matrix?.byItem ?? []).map((item) => [item.bidId, item])),
    [matrix],
  )

  async function run(action: () => Promise<unknown>, success?: string) {
    try {
      await action()
      if (success) toast.success(success)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that — try again.")
    }
  }

  const handleEstimatorQty = (item: ItemSummary, quantity: string) =>
    run(
      () => setEstimatorQuantityAction({ bidId: item.bidId, quantity }),
      item.estimateLineId ? undefined : `${item.description} added to your estimate at $0 — price it in Estimate Workspace.`,
    )

  const handleLinkSave = (cell: SheetMatrixCell, bidId: string | null) => {
    setLinkOpen(false)
    return run(() => linkCalloutAction({ calloutId: cell.calloutId, bidId }))
  }

  const handleDismiss = (cell: SheetMatrixCell) =>
    run(
      () => dismissCalloutAction({ calloutId: cell.calloutId, dismissed: !cell.dismissed }),
      cell.dismissed ? "Row restored" : "Row dismissed",
    )

  function openRfi(cell: SheetMatrixCell) {
    setRfiCell(cell)
    setRfiOpen(true)
  }
  function openLink(cell: SheetMatrixCell) {
    setLinkCell(cell)
    setLinkOpen(true)
  }

  function handleExport() {
    if (!matrix) return
    const cells = matrix.bySheet.flatMap((group) => group.cells)
    const blob = new Blob([toCsv(cells, itemsById)], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "sheet-reconciliation.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const actions = { onRfi: openRfi, onLink: openLink, onDismiss: handleDismiss }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-6">
        <ProjectHeader
          title="Sheet-by-Sheet Reconciliation"
          subtitle={project ? `${project.name} · #${project.number}` : "No project yet"}
        />

        {!project ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FilePlus />
              </EmptyMedia>
              <EmptyTitle>No project yet</EmptyTitle>
              <EmptyDescription>Create a project and upload its plan set first.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : !data.hasPlanSet ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Upload />
              </EmptyMedia>
              <EmptyTitle>No plan set yet</EmptyTitle>
              <EmptyDescription>
                Upload the plans under Upload Documents. When processing finishes, every
                quantity printed on a sheet shows up here against the bid form.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => router.push(`/upload?project=${project.id}`)}>
                <Upload data-icon="inline-start" />
                Upload plans
              </Button>
            </EmptyContent>
          </Empty>
        ) : !matrix || (matrix.stats.cellCount === 0 && matrix.dismissed.length === 0) ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                {data.processingCount > 0 ? <Loader2 className="animate-spin" /> : <FileQuestion />}
              </EmptyMedia>
              <EmptyTitle>
                {data.processingCount > 0
                  ? "Reading the plan sheets…"
                  : "No printed quantities found"}
              </EmptyTitle>
              <EmptyDescription>
                {data.processingCount > 0
                  ? "The sheets are still being read. Check back in a few minutes."
                  : data.legacyPlanSetCount > 0
                    ? "This plan set was processed before sheet reading existed. Re-upload it to read the quantities printed on each sheet."
                    : "No schedule, summary table, or note on these sheets states a quantity. Most plan-view sheets don't — that's expected."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            {!data.hasBidForm ? (
              <div className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
                  <p className="text-sm">
                    <span className="font-semibold">No official bid form yet.</span>{" "}
                    The sheets have been read, but there&apos;s nothing to compare them to.
                    Import the bid form and every row links up automatically.
                  </p>
                </div>
                <Button variant="outline" render={<Link href="/reconciliation" />}>
                  Import bid form
                </Button>
              </div>
            ) : null}

            <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-semibold">{matrix.stats.sheetCount} sheets</span>
                <span className="text-muted-foreground">·</span>
                <span className="font-semibold">{matrix.stats.cellCount} printed quantities</span>
                <span className="text-muted-foreground">·</span>
                <span
                  className={cn(
                    "font-semibold",
                    matrix.stats.discrepancyCount > 0 ? "text-warning" : "text-success",
                  )}
                >
                  {matrix.stats.discrepancyCount} differ from the bid form
                </span>
                {matrix.stats.unlinkedCount > 0 ? (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-semibold text-destructive">
                      {matrix.stats.unlinkedCount} not on the bid form
                    </span>
                  </>
                ) : null}
                {matrix.stats.itemsWithoutCalloutsCount > 0 ? (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">
                      {matrix.stats.itemsWithoutCalloutsCount} bid items no sheet states
                    </span>
                  </>
                ) : null}
                {data.processingCount > 0 ? (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" />
                      {data.processingCount} plan set{data.processingCount === 1 ? "" : "s"} still
                      processing
                    </span>
                  </>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Stated on sheet</span> is the number
                printed on that sheet — a schedule row, a summary table, a note.{" "}
                <span className="font-medium text-foreground">AI takeoff</span> is the measured
                quantity for the whole set.{" "}
                <span className="font-medium text-foreground">Estimator qty</span> is your estimate
                line — type over it here and it changes in Estimate Workspace too.
              </p>
            </div>

            <Tabs defaultValue="sheet" className="gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <TabsList className="h-9">
                  <TabsTrigger value="sheet">By sheet</TabsTrigger>
                  <TabsTrigger value="item">By bid item</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  {matrix.dismissed.length > 0 ? (
                    <Button variant="ghost" size="sm" onClick={() => setShowDismissed((v) => !v)}>
                      {showDismissed ? "Hide" : "Show"} {matrix.dismissed.length} dismissed
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download data-icon="inline-start" />
                    Export CSV
                  </Button>
                </div>
              </div>

              <TabsContent value="sheet">
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="min-w-24">Sheet</TableHead>
                        <TableHead className="min-w-56">Bid item</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Official Qty</TableHead>
                        <TableHead className="text-right">Stated on Sheet</TableHead>
                        <TableHead className="text-right">AI Takeoff</TableHead>
                        <TableHead className="text-right">Estimator Qty</TableHead>
                        <TableHead className="text-right">Sheet − Official</TableHead>
                        <TableHead className="min-w-40">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matrix.bySheet.map((group) => (
                        <React.Fragment key={group.key}>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={10} className="py-2">
                              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <span className="font-semibold">Sheet {group.sheetNumber}</span>
                                {group.sheetTitle ? (
                                  <span className="text-sm text-muted-foreground">
                                    {group.sheetTitle}
                                  </span>
                                ) : null}
                                <span className="text-xs text-muted-foreground">
                                  {group.documentName}
                                </span>
                                {group.discrepancyCount > 0 ? (
                                  <span className="text-xs font-medium text-warning">
                                    {group.discrepancyCount} differ
                                  </span>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                          {group.cells.map((cell) => {
                            const item = cell.bidId ? itemsById.get(cell.bidId) : undefined
                            const status = CELL_STATUS[cell.status]
                            return (
                              <TableRow
                                key={cell.calloutId}
                                className={cn(
                                  cell.status === "unlinked" && "bg-destructive/5 hover:bg-destructive/10",
                                )}
                              >
                                <TableCell className="text-muted-foreground tabular-nums">
                                  {cell.sheetNumber}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-medium">
                                      {cell.itemNumber ? (
                                        <span className="mr-1.5 text-muted-foreground tabular-nums">
                                          {cell.itemNumber}
                                        </span>
                                      ) : null}
                                      {cell.description}
                                    </span>
                                    {cell.bidId && cell.calloutDescription !== cell.description ? (
                                      <span className="text-xs text-muted-foreground">
                                        Sheet says: {cell.calloutDescription}
                                      </span>
                                    ) : null}
                                    <SourceText cell={cell} />
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {cell.unit}
                                  {cell.calloutUnit.toLowerCase() !== cell.unit.toLowerCase() ? (
                                    <span className="ml-1 text-xs">({cell.calloutUnit} on sheet)</span>
                                  ) : null}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatQty(cell.officialQty)}
                                </TableCell>
                                <TableCell className="text-right font-medium tabular-nums">
                                  {formatQty(cell.statedQty)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-muted-foreground">
                                  {item ? formatQty(item.aiTakeoffQty) : "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {item ? (
                                    <EstimatorQtyCell item={item} onCommit={handleEstimatorQty} />
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    "text-right tabular-nums",
                                    cell.status === "discrepancy" ? "text-warning" : "text-muted-foreground",
                                  )}
                                >
                                  {formatSignedQty(cell.diffQty)}
                                  {cell.diffPct != null ? (
                                    <span className="ml-1 text-xs">({formatPct(cell.diffPct)})</span>
                                  ) : null}
                                </TableCell>
                                <TableCell>
                                  <StatusBadge label={status.label} color={status.color} />
                                </TableCell>
                                <TableCell>
                                  <CellActions cell={cell} {...actions} />
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="item">
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-10 text-right">#</TableHead>
                        <TableHead className="min-w-56">Bid item / sheet</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Official Qty</TableHead>
                        <TableHead className="text-right">Stated on Sheet</TableHead>
                        <TableHead className="text-right">AI Takeoff</TableHead>
                        <TableHead className="text-right">Estimator Qty</TableHead>
                        <TableHead className="text-right">Sheet − Official</TableHead>
                        <TableHead className="min-w-40">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matrix.byItem.map((item) => {
                        const status = ITEM_STATUS[item.status]
                        return (
                          <React.Fragment key={item.bidId}>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableCell className="text-right text-muted-foreground tabular-nums">
                                {item.itemNumber}
                              </TableCell>
                              <TableCell className="font-semibold">{item.description}</TableCell>
                              <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                              <TableCell className="text-right font-medium tabular-nums">
                                {formatQty(item.officialQty)}
                              </TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">
                                {item.cells.length === 0
                                  ? "—"
                                  : `${item.cells.length} sheet${item.cells.length === 1 ? "" : "s"}`}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {item.aiTakeoffQty == null ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                      {formatQty(item.aiTakeoffQty)}
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {item.aiTakeoffSheets
                                        ? `Measured from ${item.aiTakeoffSheets}`
                                        : "Measured from the plan set"}
                                      {item.aiTakeoffConfidence != null
                                        ? ` · confidence ${item.aiTakeoffConfidence}%`
                                        : ""}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <EstimatorQtyCell item={item} onCommit={handleEstimatorQty} />
                              </TableCell>
                              <TableCell />
                              <TableCell>
                                <StatusBadge label={status.label} color={status.color} />
                              </TableCell>
                              <TableCell />
                            </TableRow>
                            {item.cells.map((cell) => {
                              const cellStatus = CELL_STATUS[cell.status]
                              return (
                                <TableRow key={cell.calloutId}>
                                  <TableCell />
                                  <TableCell>
                                    <div className="flex flex-col gap-0.5 pl-4">
                                      <span className="text-sm">
                                        <span className="font-medium">Sheet {cell.sheetNumber}</span>
                                        {cell.sheetTitle ? (
                                          <span className="ml-1.5 text-muted-foreground">
                                            {cell.sheetTitle}
                                          </span>
                                        ) : null}
                                      </span>
                                      {cell.calloutDescription !== item.description ? (
                                        <span className="text-xs text-muted-foreground">
                                          Sheet says: {cell.calloutDescription}
                                        </span>
                                      ) : null}
                                      <SourceText cell={cell} />
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {cell.calloutUnit}
                                  </TableCell>
                                  <TableCell />
                                  <TableCell className="text-right font-medium tabular-nums">
                                    {formatQty(cell.statedQty)}
                                  </TableCell>
                                  <TableCell />
                                  <TableCell />
                                  <TableCell
                                    className={cn(
                                      "text-right tabular-nums",
                                      cell.status === "discrepancy" ? "text-warning" : "text-muted-foreground",
                                    )}
                                  >
                                    {formatSignedQty(cell.diffQty)}
                                    {cell.diffPct != null ? (
                                      <span className="ml-1 text-xs">({formatPct(cell.diffPct)})</span>
                                    ) : null}
                                  </TableCell>
                                  <TableCell>
                                    <StatusBadge label={cellStatus.label} color={cellStatus.color} />
                                  </TableCell>
                                  <TableCell>
                                    <CellActions cell={cell} {...actions} />
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </React.Fragment>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>

            {matrix.unlinked.length > 0 ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
                  <p className="text-sm">
                    <span className="font-semibold text-destructive">
                      {matrix.unlinked.length} printed{" "}
                      {matrix.unlinked.length === 1 ? "quantity has" : "quantities have"} no bid
                      item.
                    </span>{" "}
                    {data.hasBidForm
                      ? "Either the bid form is missing scope the plans show — an RFI — or the match wasn't obvious. Link the ones that belong to an item; RFI the rest."
                      : "Import the official bid form to link them."}
                  </p>
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="min-w-24">Sheet</TableHead>
                        <TableHead className="min-w-56">On the plans</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Stated on Sheet</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matrix.unlinked.map((cell) => (
                        <TableRow key={cell.calloutId} className="bg-destructive/5 hover:bg-destructive/10">
                          <TableCell className="text-muted-foreground tabular-nums">
                            {cell.sheetNumber}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">{cell.calloutDescription}</span>
                              <SourceText cell={cell} />
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{cell.calloutUnit}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatQty(cell.statedQty)}
                          </TableCell>
                          <TableCell>
                            <CellActions cell={cell} {...actions} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}

            {showDismissed && matrix.dismissed.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border opacity-80">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="min-w-24">Sheet</TableHead>
                      <TableHead className="min-w-56">Dismissed</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Stated on Sheet</TableHead>
                      <TableHead className="text-right">Restore</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matrix.dismissed.map((cell) => (
                      <TableRow key={cell.calloutId}>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {cell.sheetNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{cell.calloutDescription}</span>
                            <SourceText cell={cell} />
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{cell.calloutUnit}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(cell.statedQty)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => handleDismiss(cell)}>
                            <Undo2 data-icon="inline-start" />
                            Restore
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 border-t pt-4">
              <Button variant="outline" render={<Link href="/reconciliation" />}>
                <ArrowLeft data-icon="inline-start" />
                Bid Form Reconciliation
              </Button>
            </div>
          </>
        )}
      </div>

      <RfiDraftDialog
        cell={rfiCell}
        open={rfiOpen}
        onOpenChange={setRfiOpen}
        onCopied={(cell) => {
          void recordRfiDraftedAction(cell.calloutId).catch(() => {})
        }}
      />
      <LinkCalloutDialog
        cell={linkCell}
        items={matrix?.byItem ?? []}
        open={linkOpen}
        onOpenChange={setLinkOpen}
        onSave={handleLinkSave}
      />
    </TooltipProvider>
  )
}
