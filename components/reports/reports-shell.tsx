"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import posthog from "posthog-js"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { BidCountdownBadge } from "@/components/bid-countdown-badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useProjectState } from "@/components/project-state-provider"
import { reports, type ReportId } from "@/lib/report-data"
import {
  exportEstimateSummaryExcel,
  exportEstimateSummaryPdf,
  exportReconciliationExcel,
  exportReconciliationPdf,
  exportTableExcel,
  exportTablePdf,
  formatFileSize,
} from "@/lib/report-export"
import { ReportPicker } from "@/components/reports/report-picker"
import {
  ExportBar,
  type DownloadEntry,
  type ExportFormat,
} from "@/components/reports/export-bar"
import {
  CostKindReport,
  DetailedEstimateReport,
  EstimateSummaryReport,
  ProposalSummaryReport,
  QuantitySummaryReport,
  ReconciliationReport,
  type ReportContext,
  type ReportOptions,
} from "@/components/reports/report-previews"
import {
  costKindTable,
  detailedEstimateTable,
  proposalTable,
  quantitySummaryTable,
} from "@/lib/report-tables"
import type { EstimateLineView } from "@/lib/estimate-view"
import type { ReconciliationRowView } from "@/lib/reconciliation-view"

const fileSlug: Record<ReportId, string> = {
  "estimate-summary": "Estimate_Summary",
  "detailed-estimate": "Detailed_Estimate",
  "quantity-summary": "Quantity_Summary",
  reconciliation: "Reconciliation_Report",
  "labor-summary": "Labor_Summary",
  "material-summary": "Material_Summary",
  "equipment-summary": "Equipment_Summary",
  "proposal-summary": "Proposal_Summary",
}

export function ReportsShell({
  context,
  estimateRows,
  reconciliationRows,
  subtotal,
  markup,
  bidTotal,
  reviewedCount,
  overriddenCount,
}: {
  context: ReportContext
  estimateRows: EstimateLineView[]
  reconciliationRows: ReconciliationRowView[]
  subtotal: string
  markup: string
  bidTotal: string
  reviewedCount: number
  overriddenCount: number
}) {
  const router = useRouter()
  const [selected, setSelected] = React.useState<ReportId>("reconciliation")
  const [loading, setLoading] = React.useState(false)
  const [format, setFormat] = React.useState<ExportFormat>("pdf")
  const [options, setOptions] = React.useState<ReportOptions>({
    sourceReferences: true,
    provenanceLegend: true,
  })
  const [downloads, setDownloads] = React.useState<DownloadEntry[]>([])
  const downloadId = React.useRef(0)
  const { costSetupComplete, currentProjectId } = useProjectState()
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false)

  function handleSelect(id: ReportId) {
    if (id === selected) return
    setSelected(id)
    setLoading(true)
  }

  React.useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => setLoading(false), 1500)
    return () => clearTimeout(timer)
  }, [loading])

  function performExport(preliminary: boolean, exportFormat: ExportFormat = format) {
    const ext = exportFormat === "pdf" ? "pdf" : "xlsx"
    const name = `${fileSlug[selected]}_${context.projectNumber}.${ext}`
    const currentReport = reports.find((r) => r.id === selected)
    let bytes: number
    if (selected === "estimate-summary") {
      bytes =
        exportFormat === "pdf"
          ? exportEstimateSummaryPdf(context, estimateRows, subtotal, markup, bidTotal, name)
          : exportEstimateSummaryExcel(context, estimateRows, subtotal, markup, bidTotal, name)
    } else if (selected === "reconciliation") {
      bytes =
        exportFormat === "pdf"
          ? exportReconciliationPdf(context, reconciliationRows, bidTotal, name)
          : exportReconciliationExcel(context, reconciliationRows, name)
    } else if (selected === "detailed-estimate") {
      const table = detailedEstimateTable(estimateRows)
      bytes =
        exportFormat === "pdf"
          ? exportTablePdf("Detailed Estimate", context, table, name)
          : exportTableExcel("Detailed Estimate", context, table, name)
    } else if (selected === "quantity-summary") {
      const table = quantitySummaryTable(estimateRows)
      bytes =
        exportFormat === "pdf"
          ? exportTablePdf("Quantity Summary", context, table, name)
          : exportTableExcel("Quantity Summary", context, table, name)
    } else if (selected === "labor-summary") {
      const table = costKindTable(estimateRows, "labor")
      bytes =
        exportFormat === "pdf"
          ? exportTablePdf("Labor Summary", context, table, name)
          : exportTableExcel("Labor Summary", context, table, name)
    } else if (selected === "material-summary") {
      const table = costKindTable(estimateRows, "material")
      bytes =
        exportFormat === "pdf"
          ? exportTablePdf("Material Summary", context, table, name)
          : exportTableExcel("Material Summary", context, table, name)
    } else if (selected === "equipment-summary") {
      const table = costKindTable(estimateRows, "equip")
      bytes =
        exportFormat === "pdf"
          ? exportTablePdf("Equipment Summary", context, table, name)
          : exportTableExcel("Equipment Summary", context, table, name)
    } else if (selected === "proposal-summary") {
      const table = {
        ...proposalTable(estimateRows),
        totals: [
          ["Subtotal", subtotal],
          ["Markup", markup],
          ["Bid Total", bidTotal],
        ] as Array<[string, string]>,
      }
      bytes =
        exportFormat === "pdf"
          ? exportTablePdf("Proposal Summary", context, table, name)
          : exportTableExcel("Proposal Summary", context, table, name)
    } else {
      toast.error(`${currentReport?.name ?? "This report"} isn't available to export yet.`)
      return
    }

    toast.success(`${name} downloaded${preliminary ? " (marked Preliminary)" : ""}`)

    posthog.capture("estimate_export_requested", {
      format: exportFormat,
      reportId: selected,
      preliminary,
    })

    downloadId.current += 1
    setDownloads((prev) => [
      {
        id: downloadId.current,
        name,
        size: formatFileSize(bytes),
        time: "Just now",
      },
      ...prev,
    ])
  }

  function handleExport(exportFormat?: ExportFormat) {
    if (exportFormat) setFormat(exportFormat)
    if (!costSetupComplete) {
      setExportDialogOpen(true)
      return
    }
    performExport(false, exportFormat ?? format)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-1 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Reports
          </h1>
          <BidCountdownBadge />
        </div>
        <p className="text-sm text-muted-foreground">
          {context.projectName} · #{context.projectNumber}
        </p>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden p-6">
        <aside className="w-72 shrink-0 overflow-auto">
          <ReportPicker selected={selected} onSelect={handleSelect} />
        </aside>

        <div className="flex flex-1 flex-col gap-4 overflow-auto">
          <ExportBar
            format={format}
            onFormatChange={setFormat}
            options={options}
            onOptionsChange={setOptions}
            onExport={handleExport}
            downloads={downloads}
          />

          <div className="flex justify-center rounded-lg bg-muted/40 p-6">
            <div className="w-full max-w-3xl rounded-md border border-border bg-background p-8 shadow-lg">
              {loading ? (
                <ReportSkeleton />
              ) : selected === "reconciliation" ? (
                <ReconciliationReport
                  context={context}
                  rows={reconciliationRows}
                  bidTotal={bidTotal}
                  reviewedCount={reviewedCount}
                  overriddenCount={overriddenCount}
                  options={options}
                />
              ) : selected === "detailed-estimate" ? (
                <DetailedEstimateReport
                  context={context}
                  rows={estimateRows}
                  options={options}
                />
              ) : selected === "quantity-summary" ? (
                <QuantitySummaryReport
                  context={context}
                  rows={estimateRows}
                  options={options}
                />
              ) : selected === "labor-summary" ? (
                <CostKindReport
                  context={context}
                  rows={estimateRows}
                  kind="labor"
                  options={options}
                />
              ) : selected === "material-summary" ? (
                <CostKindReport
                  context={context}
                  rows={estimateRows}
                  kind="material"
                  options={options}
                />
              ) : selected === "equipment-summary" ? (
                <CostKindReport
                  context={context}
                  rows={estimateRows}
                  kind="equip"
                  options={options}
                />
              ) : selected === "proposal-summary" ? (
                <ProposalSummaryReport
                  context={context}
                  rows={estimateRows}
                  subtotal={subtotal}
                  markup={markup}
                  bidTotal={bidTotal}
                  options={options}
                />
              ) : (
                <EstimateSummaryReport
                  context={context}
                  rows={estimateRows}
                  subtotal={subtotal}
                  markup={markup}
                  bidTotal={bidTotal}
                  options={options}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center border-t border-border px-6 py-3">
        <Button
          variant="outline"
          onClick={() =>
            router.push(
              currentProjectId
                ? `/intelligence?project=${currentProjectId}`
                : "/intelligence",
            )
          }
        >
          <ArrowLeft data-icon="inline-start" />
          Back to Project
        </Button>
      </div>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete cost settings before exporting</DialogTitle>
            <DialogDescription>
              Before exporting, complete your cost settings (2 rates and
              insurance % are missing). Reports must reflect final costs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setExportDialogOpen(false)
                router.push("/cost-setup")
              }}
            >
              Go to Cost Setup
            </Button>
            <DialogClose
              render={
                <Button
                  onClick={() => performExport(true)}
                >
                  Export Anyway (marked Preliminary)
                </Button>
              }
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="mt-2 flex flex-col gap-2">
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    </div>
  )
}
