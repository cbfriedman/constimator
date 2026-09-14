"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  Check,
  Circle,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
  confirmTakeoffItemsAction,
  getProcessingStatus,
  retryTakeoffJobAction,
  type ProcessingItem,
} from "@/app/processing/actions"

const POLL_INTERVAL_MS = 3000
// ~5 minutes of polling before giving up and telling the user rather than
// silently polling forever against a job stuck in "running" (e.g. a
// crashed worker that never wrote back a terminal status).
const MAX_POLLS = 100

function isTerminal(status: ProcessingItem["status"]) {
  return status === "complete" || status === "failed" || status === "not_queued"
}

function StatusIcon({ status }: { status: ProcessingItem["status"] }) {
  if (status === "complete") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-success text-success-foreground">
        <Check className="size-3.5" />
      </span>
    )
  }
  if (status === "failed") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <AlertTriangle className="size-3.5" />
      </span>
    )
  }
  if (status === "running") {
    return <Loader2 className="size-5 animate-spin text-primary" />
  }
  return <Circle className="size-5 text-muted-foreground/40" />
}

function statusLabel(status: ProcessingItem["status"]) {
  switch (status) {
    case "complete":
      return "Complete"
    case "failed":
      return "Failed"
    case "running":
      return "Processing…"
    case "queued":
      return "Queued"
    case "not_queued":
      return "Not queued"
  }
}

export function ProcessingShell({
  projectId,
  projectName,
  projectNumber,
  initialItems,
}: {
  projectId: string
  projectName: string
  projectNumber: string
  initialItems: ProcessingItem[]
}) {
  const router = useRouter()
  const [items, setItems] = useState<ProcessingItem[]>(initialItems)
  const [gaveUp, setGaveUp] = useState(false)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const pollCount = useRef(0)

  const allTerminal = items.length > 0 && items.every((item) => isTerminal(item.status))
  const anyFailed = items.some((item) => item.status === "failed")
  // A finished bid form is the one result with somewhere specific to go next:
  // its items are the official schedule waiting to be imported on
  // /reconciliation, and nothing on this page said so.
  const hasExtractedBidForm = items.some(
    (item) => item.status === "complete" && item.kind === "bid_form",
  )
  // Measured quantities that nobody has accepted yet. Until migration 0016
  // these went into the estimate by themselves on this very page load.
  const awaitingConfirmation = items.filter((item) => item.awaitingConfirmation)
  const doneCount = items.filter((item) => isTerminal(item.status)).length
  const progress = items.length === 0 ? 0 : Math.round((doneCount / items.length) * 100)

  useEffect(() => {
    if (items.length === 0 || allTerminal || gaveUp) return

    const timer = setInterval(async () => {
      const next = await getProcessingStatus(projectId)
      setItems(next)
      pollCount.current += 1
      if (pollCount.current >= MAX_POLLS) setGaveUp(true)
    }, POLL_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [projectId, items.length, allTerminal, gaveUp])

  async function handleRetry(documentId: string) {
    setRetryingId(documentId)
    try {
      await retryTakeoffJobAction(documentId)
      pollCount.current = 0
      setGaveUp(false)
      setItems(await getProcessingStatus(projectId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't retry — try again.")
    } finally {
      setRetryingId(null)
    }
  }

  async function handleConfirmTakeoff(documentId: string) {
    setConfirmingId(documentId)
    try {
      await confirmTakeoffItemsAction(documentId)
      setItems(await getProcessingStatus(projectId))
      toast.success("Quantities added to your estimate — unpriced, ready for you to price.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't confirm — try again.")
    } finally {
      setConfirmingId(null)
    }
  }

  const canContinue = items.length === 0 || allTerminal || gaveUp

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-primary">AI Processing</p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          AI Processing
        </h1>
        <p className="text-sm text-muted-foreground">
          {projectName} · #{projectNumber}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {items.length === 0
              ? "No documents to process"
              : allTerminal
                ? anyFailed
                  ? "Processing finished — some documents failed"
                  : "Processing complete"
                : "Analyzing bid package"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Upload documents first — there&apos;s nothing queued for this
              project yet.
            </p>
          ) : (
            <ol className="flex flex-col gap-1">
              {items.map((item) => {
                const failed = item.status === "failed"
                return (
                  <li
                    key={item.documentId}
                    className={cn(
                      "flex flex-col gap-1 rounded-md px-3 py-2.5 text-sm transition-colors",
                      item.status === "running" && "bg-primary/5",
                      failed && "bg-destructive/5",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-5 shrink-0 items-center justify-center">
                        <StatusIcon status={item.status} />
                      </span>
                      <span
                        className={cn(
                          "flex-1",
                          isTerminal(item.status) && !failed
                            ? "text-foreground"
                            : item.status === "running"
                              ? "font-medium text-foreground"
                              : "text-muted-foreground",
                        )}
                      >
                        {item.fileName}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          item.status === "complete" && "text-success",
                          failed && "text-destructive",
                          item.status === "running" && "text-primary",
                        )}
                      >
                        {statusLabel(item.status)}
                      </span>
                      {failed ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={retryingId === item.documentId}
                          onClick={() => handleRetry(item.documentId)}
                        >
                          <RotateCcw
                            data-icon="inline-start"
                            className={cn(
                              retryingId === item.documentId && "animate-spin",
                            )}
                          />
                          {retryingId === item.documentId ? "Retrying…" : "Retry"}
                        </Button>
                      ) : null}
                    </div>
                    {failed && item.error ? (
                      <p className="pl-8 text-xs text-destructive">{item.error}</p>
                    ) : null}
                    {item.pageCount != null &&
                    item.pagesRead != null &&
                    item.pagesRead < item.pageCount ? (
                      <p className="pl-8 text-xs text-warning">
                        Read {item.pagesRead} of {item.pageCount} sheets — this
                        document is longer than Constimator reads in one pass,
                        so any quantity below covers only the first{" "}
                        {item.pagesRead} sheets.
                      </p>
                    ) : null}
                    {item.awaitingConfirmation ? (
                      <div className="ml-8 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5">
                        <AlertTriangle className="size-4 shrink-0 text-warning" />
                        <p className="flex-1 text-xs">
                          {item.pendingItemCount === 1
                            ? "1 quantity was measured"
                            : `${item.pendingItemCount} quantities were measured`}{" "}
                          off these drawings. Check them before they go into
                          your estimate — nothing is added until you do.
                        </p>
                        <Button
                          size="sm"
                          disabled={confirmingId === item.documentId}
                          onClick={() => handleConfirmTakeoff(item.documentId)}
                        >
                          {confirmingId === item.documentId
                            ? "Adding…"
                            : "Add to estimate"}
                        </Button>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          )}

          {items.length > 0 ? (
            <div className="flex flex-col gap-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">
                {gaveUp
                  ? "Still working after several minutes — check back later, or continue and come back to this project."
                  : allTerminal
                    ? anyFailed
                      ? "Some documents failed to process — see details above."
                      : "All documents processed."
                    : `${doneCount} of ${items.length} document(s) done.`}
              </p>
              {awaitingConfirmation.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {awaitingConfirmation.length} document(s) have measured
                  quantities waiting for you to check. They are not in your
                  estimate yet.
                </p>
              ) : null}
              {allTerminal && hasExtractedBidForm ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5">
                  <Sparkles className="size-4 shrink-0 text-primary" />
                  <p className="flex-1 text-sm">
                    Bid form extracted — open Bid Reconciliation to import.
                  </p>
                  <Button
                    size="sm"
                    onClick={() =>
                      router.push(`/reconciliation?project=${projectId}`)
                    }
                  >
                    Bid Reconciliation
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
        <Button
          variant="outline"
          onClick={() => router.push(`/schedules?project=${projectId}`)}
          disabled={!canContinue}
        >
          View Schedules &amp; Tables
        </Button>
        <Button onClick={() => router.push(`/intelligence?project=${projectId}`)} disabled={!canContinue}>
          View Project Intelligence
        </Button>
      </div>
    </div>
  )
}
