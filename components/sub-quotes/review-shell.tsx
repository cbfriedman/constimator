"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, CircleAlert, Loader2 } from "lucide-react"

import type { SubQuoteListItem, SubQuoteReview } from "@/app/sub-quotes/actions"
import { ConditionRow } from "@/components/sub-quotes/condition-row"
import { DocumentPane } from "@/components/sub-quotes/document-pane"
import { ProjectHeader } from "@/components/project-header"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export function ReviewShell({
  projectName,
  quotes,
  review,
}: {
  projectName: string
  quotes: SubQuoteListItem[]
  review: SubQuoteReview
}) {
  const router = useRouter()
  const [pickedId, setPickedId] = React.useState<string | null>(null)
  const { progress } = review

  // Derived during render rather than seeded by an effect: before anything is
  // clicked, the selection *is* "the first thing that needs looking at", which
  // puts the document on the page that matters instead of page 1 of a document
  // nobody reads from the top. Falls back to the first row once every flagged
  // item is confirmed.
  const defaultId =
    review.conditions.find((c) => !c.isConfirmed && c.riskScore > 0)?.id ??
    review.conditions[0]?.id ??
    null
  const selectedId = pickedId ?? defaultId
  const selected = review.conditions.find((c) => c.id === selectedId) ?? null

  return (
    <div className="flex h-full flex-col gap-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <ProjectHeader
          title="Review sub quote"
          subtitle={`${review.subQuote.subName} · ${review.subQuote.trade} · ${projectName}`}
        />
        {quotes.length > 1 ? (
          <Select
            value={review.subQuote.id}
            onValueChange={(id) => router.push(`/sub-quotes?quote=${id}`)}
          >
            <SelectTrigger className="w-64" aria-label="Choose a sub quote">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {quotes.map((quote) => (
                <SelectItem key={quote.id} value={quote.id}>
                  {quote.subName} — {quote.confirmed}/{quote.total}
                  {quote.flaggedRemaining > 0 ? ` · ${quote.flaggedRemaining} flagged` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <CompletionIndicator progress={progress} />

      {review.notesMuted ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          The extractor was unsure about nearly every line on this quote, so its
          per-line notes aren&apos;t shown — they wouldn&apos;t tell you where to look.
          Confidence, handwriting, and quantity checks below are unaffected. Treat the
          whole document as needing a careful read.
        </p>
      ) : null}

      {review.conditions.length === 0 ? (
        <EmptyState reason={review.pendingReason} />
      ) : (
        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-2">
          <ol className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
            {review.conditions.map((condition) => (
              <ConditionRow
                key={condition.id}
                condition={condition}
                isSelected={condition.id === selectedId}
                onSelect={() => setPickedId(condition.id)}
                onChanged={() => router.refresh()}
              />
            ))}
          </ol>

          {/* Sticky on wide screens so the document stays put while the
              condition list scrolls past it. */}
          <div className="min-h-0 lg:sticky lg:top-6 lg:h-[calc(100vh-12rem)]">
            <DocumentPane
              subQuoteId={review.subQuote.id}
              fileName={review.subQuote.fileName}
              mimeType={review.subQuote.mimeType}
              activePage={selected?.sourcePage ?? null}
              activeText={selected?.rawText ?? null}
              activeBoundingBox={selected?.boundingBox ?? null}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/** "14 of 18 confirmed" — the per-quote completion indicator. */
function CompletionIndicator({ progress }: { progress: SubQuoteReview["progress"] }) {
  const percent = progress.total === 0 ? 0 : (progress.confirmed / progress.total) * 100

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground tabular-nums">{progress.label}</span>
        {progress.isComplete ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
            <Check className="size-4" aria-hidden="true" />
            Every condition reviewed
          </span>
        ) : progress.flaggedRemaining > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <CircleAlert className="size-4 text-warning" aria-hidden="true" />
            {progress.flaggedRemaining} flagged{" "}
            {progress.flaggedRemaining === 1 ? "item needs" : "items need"} a look first
          </span>
        ) : null}
      </div>
      <Progress
        value={percent}
        className={cn(progress.isComplete && "[&>*]:bg-success")}
        aria-label={progress.label}
      />
    </div>
  )
}

function EmptyState({ reason }: { reason: SubQuoteReview["pendingReason"] }) {
  if (reason === "extracting") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Reading this quote. Reload in a moment — nothing is lost if you leave.
        </p>
      </div>
    )
  }

  if (reason === "failed") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <CircleAlert className="size-5 text-warning" aria-hidden="true" />
        <p className="max-w-md text-sm text-muted-foreground">
          Reading this quote didn&apos;t finish. You can retry it from Document
          Processing, or work from the original — it&apos;s shown on this page either way.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <p className="max-w-md text-sm text-muted-foreground">
        No conditions were found on this document. That usually means it isn&apos;t a
        subcontractor quote — check the original on the right.
      </p>
    </div>
  )
}
