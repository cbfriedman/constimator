"use client"

import { Copy } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SourceChip } from "@/components/intelligence/source-reference"
import { cn } from "@/lib/utils"

type Severity = "high" | "medium" | "low"

const severityStyles: Record<Severity, string> = {
  high: "border-destructive/40 bg-destructive/10 text-destructive",
  medium: "border-warning/40 bg-warning/10 text-warning",
  low: "border-yellow-500/40 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
}

const cardBorder: Record<Severity, string> = {
  high: "border-l-4 border-l-destructive",
  medium: "border-l-4 border-l-warning",
  low: "border-l-4 border-l-yellow-500",
}

const risks: {
  severity: Severity
  label: string
  text: string
  sources: string[]
}[] = [
  {
    severity: "high",
    label: "High",
    text: "Geotech reports groundwater at 4 ft in drainage area; RCP trench (5–7 ft) may need dewatering — no dewatering bid item exists.",
    sources: ["Geotechnical_Report.pdf p.22"],
  },
  {
    severity: "medium",
    label: "Medium",
    text: "Cold plane and overlay quantities imply 2-inch grind but detail on C-501 shows 2.5-inch at intersections.",
    sources: ["Sheet C-501"],
  },
  {
    severity: "medium",
    label: "Medium",
    text: "Working hours restricted 8:30–4:00; HMA paving production may be constrained.",
    sources: ["Spec 00 73 00"],
  },
  {
    severity: "low",
    label: "Low",
    text: "Striping layout on C-601 conflicts with sign schedule quantity (14 vs 15 signs).",
    sources: ["Sheet C-601", "Sheet C-602"],
  },
]

const potentialRfis = [
  "Please confirm responsibility for utility potholing along Deschutes Road.",
  "Please clarify grind depth at intersections: plan detail C-501 shows 2.5 inches; quantities appear based on 2 inches.",
]

export function RisksTab() {
  function handleCopy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
    toast.success("RFI copied to clipboard")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {risks.map((risk, index) => (
          <Card key={index} className={cn(cardBorder[risk.severity])}>
            <CardContent className="flex flex-col gap-3 pt-6">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn("uppercase", severityStyles[risk.severity])}
                >
                  {risk.label}
                </Badge>
              </div>
              <p className="leading-relaxed text-foreground">{risk.text}</p>
              <span className="flex flex-wrap items-center gap-1.5">
                {risk.sources.map((source) => (
                  <SourceChip key={source} label={source} />
                ))}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Potential RFIs</CardTitle>
          <CardDescription>
            Pre-drafted questions based on detected gaps and conflicts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {potentialRfis.map((rfi, index) => (
            <div
              key={index}
              className="flex items-start justify-between gap-4 rounded-lg border bg-muted/30 p-3"
            >
              <p className="leading-relaxed text-foreground">
                <span className="mr-2 font-semibold text-muted-foreground">
                  {index + 1}.
                </span>
                {rfi}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(rfi)}
                className="shrink-0"
              >
                <Copy data-icon="inline-start" />
                Copy
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
