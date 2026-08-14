"use client"

import { useState } from "react"
import { AlertTriangle, Check, Copy, ShieldAlert, Sparkles } from "lucide-react"
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { demoProject } from "@/lib/mock-data"
import { rfiSuggestions, type RfiSeverity } from "@/lib/rfi-suggestions-data"
import type { IntelligenceProjectView } from "@/app/intelligence/actions"

const severityMeta: Record<RfiSeverity, { label: string; className: string }> = {
  high: {
    label: "High",
    className: "border-transparent bg-destructive/10 text-destructive",
  },
  medium: {
    label: "Medium",
    className: "border-transparent bg-warning/15 text-warning",
  },
  low: {
    label: "Low",
    className: "border-transparent bg-caution/15 text-caution",
  },
}

function RfiSuggestionCard({
  suggestion,
}: {
  suggestion: (typeof rfiSuggestions)[number]
}) {
  const [copied, setCopied] = useState(false)
  const severity = severityMeta[suggestion.severity]

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(suggestion.rfiText)
      setCopied(true)
      toast.success("RFI text copied")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy — select and copy the text manually.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base">{suggestion.title}</CardTitle>
          <Badge className={severity.className}>{severity.label}</Badge>
        </div>
        <CardDescription>{suggestion.source}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-foreground">{suggestion.flag}</p>
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Suggested RFI text
            </span>
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? (
                <Check data-icon="inline-start" />
              ) : (
                <Copy data-icon="inline-start" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground italic">
            &ldquo;{suggestion.rfiText}&rdquo;
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function RfiSuggestionsPanel() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Sparkles className="size-4 text-review" />
          RFI Suggestions ({rfiSuggestions.length})
        </h2>
        <p className="text-sm text-muted-foreground">
          Constimator found discrepancies and gaps between the bid form,
          plans, specs, and geotech that may warrant an RFI. Review each and
          copy the draft to submit.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rfiSuggestions.map((suggestion) => (
          <RfiSuggestionCard key={suggestion.id} suggestion={suggestion} />
        ))}
      </div>

      <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5 text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
        These are AI-generated suggestions based on sample project documents
        — verify against the actual contract documents before submitting any
        RFI.
      </p>
    </div>
  )
}

export function RisksTab({
  project,
}: {
  project: IntelligenceProjectView
}) {
  // Risks & RFIs isn't a real extraction feature yet — everywhere else,
  // this tab honestly says so. The suggestions above are hand-drafted demo
  // content gated to the one sample project this data was written for
  // (see lib/rfi-suggestions-data.ts), not a capability that applies to any
  // real customer's project.
  const isDemoProject = project.number === demoProject.number
  if (isDemoProject) {
    return <RfiSuggestionsPanel />
  }

  return (
    <Empty className="border py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShieldAlert />
        </EmptyMedia>
        <EmptyTitle>Risk detection isn&apos;t available yet</EmptyTitle>
        <EmptyDescription>
          Constimator doesn&apos;t currently flag plan conflicts, missing
          information, or draft RFIs from your documents — that requires
          extraction beyond quantities, which isn&apos;t built yet. Review
          your specs and drawings directly for now.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
