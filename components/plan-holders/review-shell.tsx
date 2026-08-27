"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CircleAlert, ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  getPlanHolderDocumentUrl,
  type PlanHolderListItem,
  type PlanHolderReview,
} from "@/app/plan-holders/actions"
import { HolderRow } from "@/components/plan-holders/holder-row"
import { ProjectHeader } from "@/components/project-header"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function formatIssued(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const PENDING_COPY: Record<
  NonNullable<PlanHolderReview["pendingReason"]>,
  { title: string; body: string }
> = {
  extracting: {
    title: "Still reading this list",
    body: "The worker is extracting the roster. This usually takes a minute or two — reload to check.",
  },
  failed: {
    title: "This list couldn't be read",
    body: "Extraction failed. Remove the document and upload it again, or check the AI Processing page for the error.",
  },
  none_found: {
    title: "No plan holders found",
    body: "The extractor read this document and found no roster rows in it. If it isn't a plan holders list, that's the expected answer — check the note below.",
  },
}

export function ReviewShell({
  projectName,
  lists,
  review,
}: {
  projectName: string
  lists: PlanHolderListItem[]
  review: PlanHolderReview
}) {
  const router = useRouter()
  const [opening, setOpening] = React.useState(false)
  const { progress, contacts } = review

  const issued = formatIssued(review.list.issuedOn)
  const pending = review.pendingReason ? PENDING_COPY[review.pendingReason] : null

  // Opened through a signed URL fetched on click rather than rendered into
  // the page: the URL is short-lived (15 minutes) and there is no reason to
  // mint one for a reviewer who never asks for the source.
  function openSource() {
    setOpening(true)
    getPlanHolderDocumentUrl(review.list.id)
      .then((url) => window.open(url, "_blank", "noopener,noreferrer"))
      .catch((error: unknown) =>
        toast.error(
          error instanceof Error ? error.message : "Could not open this document.",
        ),
      )
      .finally(() => setOpening(false))
  }

  return (
    <div className="flex h-full flex-col gap-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <ProjectHeader
          title="Review plan holders"
          subtitle={[review.list.sourceLabel, issued, projectName]
            .filter(Boolean)
            .join(" · ")}
        />
        {lists.length > 1 ? (
          <Select
            value={review.list.id}
            onValueChange={(id) => router.push(`/plan-holders?list=${id}`)}
          >
            <SelectTrigger className="w-64" aria-label="Choose a plan holders list">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {lists.map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.sourceLabel} ({list.confirmedCount}/{list.holderCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {progress.total > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {progress.confirmed} of {progress.total} confirmed
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={opening}
              onClick={openSource}
            >
              {opening ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <ExternalLink data-icon="inline-start" />
              )}
              Open {review.list.fileName}
            </Button>
          </div>
          <Progress value={(progress.confirmed / progress.total) * 100} />
        </div>
      ) : null}

      {/* Whatever the extractor wanted a reviewer to know about the document
          as a whole — including "this isn't a plan holders list". */}
      {review.list.documentNotes ? (
        <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          <CircleAlert
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          {review.list.documentNotes}
        </p>
      ) : null}

      {pending ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="font-medium text-foreground">{pending.title}</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {pending.body}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Each row shows the roster line exactly as printed, above what was
            read out of it. Confirm a row once the two agree — nothing
            downstream reads an unconfirmed row.
          </p>
          <ul className="flex flex-col gap-3">
            {contacts.map((holder) => (
              <HolderRow
                key={holder.id}
                holder={holder}
                onChanged={() => router.refresh()}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
