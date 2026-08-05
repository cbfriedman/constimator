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
  formatFileSize,
} from "@/lib/report-export"
import { ReportPicker } from "@/components/reports/report-picker"
import {
  ExportBar,
  type DownloadEntry,
  type ExportFormat,
} from "@/components/reports/export-bar"
import {
  EstimateSummaryReport,
  PlaceholderReport,
  ReconciliationReport,
  type ReportContext,
  type ReportOptions,
} from "@/components/reports/report-previews"
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
    reviewerComments: false,
  })
  const [downloads, setDownloads] = React.useState<DownloadEntry[]>([])
  const downloadId = React.useRef(0)
  const { costSetupComplete } = useProjectState()
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

    // Only estimate-summary and reconciliation have real preview data
    // behind them (current?.hasPreview below) — the other report ids in
    // lib/report-data.ts are still placeholders with nothing real to
    // generate a file from yet.
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
    } else {
      toast.error(`${current?.name ?? "This report"} isn't available to export yet.`)
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

  const current = reports.find((r) => r.id === selected)

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
              ) : current?.hasPreview ? (
                selected === "reconciliation" ? (
                  <ReconciliationReport
                    context={context}
                    rows={reconciliationRows}
                    bidTotal={bidTotal}
                    reviewedCount={reviewedCount}
                    overriddenCount={overriddenCount}
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
                )
              ) : (
                <PlaceholderReport reportId={selected} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center border-t border-border px-6 py-3">
        <Button
          variant="outline"
          onClick={() => router.push("/intelligence")}
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
