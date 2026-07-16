"use client"

import { Check, Download, FileSpreadsheet, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import type { ReportOptions } from "@/components/reports/report-previews"

export type ExportFormat = "pdf" | "excel"

export type DownloadEntry = {
  id: number
  name: string
  size: string
  time: string
}

const optionItems: { key: keyof ReportOptions; label: string }[] = [
  { key: "sourceReferences", label: "Include source references" },
  { key: "provenanceLegend", label: "Include quantity provenance legend" },
  { key: "reviewerComments", label: "Include reviewer comments" },
]

export function ExportBar({
  format,
  onFormatChange,
  options,
  onOptionsChange,
  onExport,
  downloads,
}: {
  format: ExportFormat
  onFormatChange: (format: ExportFormat) => void
  options: ReportOptions
  onOptionsChange: (options: ReportOptions) => void
  onExport: (format?: ExportFormat) => void
  downloads: DownloadEntry[]
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <ToggleGroup
            value={[format]}
            onValueChange={(value) => {
              const next = value[0] as ExportFormat | undefined
              if (next) onFormatChange(next)
            }}
            variant="outline"
            size="sm"
            spacing={0}
            aria-label="Export format"
          >
            <ToggleGroupItem value="pdf">
              <FileText data-icon="inline-start" />
              PDF
            </ToggleGroupItem>
            <ToggleGroupItem value="excel">
              <FileSpreadsheet data-icon="inline-start" />
              Excel
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {optionItems.map((item) => (
              <Field key={item.key} orientation="horizontal" className="w-auto">
                <Checkbox
                  id={item.key}
                  checked={options[item.key]}
                  onCheckedChange={(checked) =>
                    onOptionsChange({ ...options, [item.key]: checked === true })
                  }
                />
                <FieldLabel htmlFor={item.key} className="font-normal">
                  {item.label}
                </FieldLabel>
              </Field>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={format === "pdf" ? "default" : "outline"}
            onClick={() => {
              onFormatChange("pdf")
              onExport("pdf")
            }}
          >
            <FileText data-icon="inline-start" />
            Export PDF
          </Button>
          <Button
            variant={format === "excel" ? "default" : "outline"}
            onClick={() => {
              onFormatChange("excel")
              onExport("excel")
            }}
          >
            <FileSpreadsheet data-icon="inline-start" />
            Export Excel
          </Button>
        </div>
      </div>

      {downloads.length > 0 ? (
        <div className="flex flex-col gap-2">
          {downloads.map((download) => (
            <div
              key={download.id}
              className="flex items-center gap-3 rounded-md border border-success/30 bg-success/5 px-3 py-2"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success/15">
                <Check className="size-3.5 text-success" />
              </span>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium text-foreground">
                  {download.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {download.size} · {download.time}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className={cn("text-muted-foreground")}
              >
                <Download data-icon="inline-start" />
                Download
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
