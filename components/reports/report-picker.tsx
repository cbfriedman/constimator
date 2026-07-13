"use client"

import { FileText } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { reports, type ReportId } from "@/lib/report-data"

export function ReportPicker({
  selected,
  onSelect,
}: {
  selected: ReportId
  onSelect: (id: ReportId) => void
}) {
  return (
    <nav aria-label="Report types" className="flex flex-col gap-2">
      {reports.map((report) => {
        const isSelected = report.id === selected
        return (
          <button
            key={report.id}
            type="button"
            onClick={() => onSelect(report.id)}
            aria-current={isSelected ? "true" : undefined}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
              isSelected
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:bg-accent",
            )}
          >
            <FileText
              className={cn(
                "mt-0.5 size-4 shrink-0",
                isSelected ? "text-primary" : "text-muted-foreground",
              )}
            />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-medium leading-tight",
                    isSelected ? "text-primary" : "text-foreground",
                  )}
                >
                  {report.name}
                </span>
                {report.recommended ? (
                  <Badge className="border-transparent bg-primary/10 text-primary">
                    Recommended
                  </Badge>
                ) : null}
              </div>
              <span className="text-xs text-muted-foreground">
                {report.description}
              </span>
            </div>
          </button>
        )
      })}
    </nav>
  )
}
