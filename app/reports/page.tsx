"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { demoProject } from "@/lib/demo-data"
import { reports, type ReportId } from "@/lib/report-data"
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
  type ReportOptions,
} from "@/components/reports/report-previews"

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

export default function ReportsPage() {
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

  function handleExport() {
    const ext = format === "pdf" ? "pdf" : "xlsx"
    const number = demoProject.number
    const name = `${fileSlug[selected]}_${number}.${ext}`
    toast.success(`${name} ready`)
    downloadId.current += 1
    setDownloads((prev) => [
      {
        id: downloadId.current,
        name,
        size: format === "pdf" ? "1.4 MB" : "486 KB",
        time: "Just now",
      },
      ...prev,
    ])
  }

  const current = reports.find((r) => r.id === selected)

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-1 border-b border-border px-6 py-4">
        <h1 className="text-xl font-semibold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">
          {demoProject.name} · #{demoProject.number}
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
                  <ReconciliationReport options={options} />
                ) : (
                  <EstimateSummaryReport options={options} />
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
