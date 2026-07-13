"use client"

import { Info } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { CostSourceMenu } from "@/components/estimate/cost-source-menu"

const lines = [
  {
    category: "Labor",
    detail: "Paving crew — 8 workers · production 485 TON/day (entered manually)",
  },
  {
    category: "Material",
    detail: "HMA Type A supply — $74.50/TON (entered manually)",
  },
  {
    category: "Equipment",
    detail: "Paver + 2 rollers (entered manually)",
  },
]

export function CostBreakdown() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">
          Cost breakdown — HMA Type A
        </h4>
        <Badge
          variant="outline"
          className="gap-1 border-warning/50 bg-warning/10 text-warning"
        >
          <Info className="size-3" />
          CA DIR prevailing wage rates apply
        </Badge>
      </div>
      <div className="flex flex-col divide-y divide-border/60 rounded-md border bg-background">
        {lines.map((line) => (
          <div
            key={line.category}
            className="flex items-center gap-3 px-3 py-2.5"
          >
            <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
              {line.category}
            </span>
            <span className="flex-1 text-sm text-foreground">
              {line.detail}
            </span>
            <CostSourceMenu label={line.category} />
          </div>
        ))}
      </div>
    </div>
  )
}
