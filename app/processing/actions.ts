"use server"

import { eq, inArray } from "drizzle-orm"

import { generateEstimateFromTakeoff } from "@/app/estimate/actions"
import { documents, takeoffJobs } from "@/db/schema"
import { requireWrite } from "@/lib/authz"
import { getScopedDb } from "@/lib/db/scoped"
import { logger } from "@/lib/logger"
import { queueTakeoffJob } from "@/lib/takeoff-queue"
import { parseInput, uuidSchema } from "@/lib/validation"

export type ProcessingItemStatus =
  | "queued"
  | "running"
  | "complete"
  | "failed"
  // A document with no job row at all — shouldn't normally happen (every
  // confirmed upload queues one), but confirmDocumentUpload doesn't fail
  // the upload if queuing the job fails, so this is the honest fallback
  // rather than pretending a job exists.
  | "not_queued"

export type ProcessingItem = {
  documentId: string
  fileName: string
  status: ProcessingItemStatus
  error: string | null
  /**
   * Which extractor produced this job's result — the only part of
   * `job.result` the client is given, so the page can say what finished
   * rather than only that something did. Null when there is no job yet or
   * the row predates the field (see db/schema.ts: absent means plan takeoff).
   */
  kind: string | null
  /**
   * Plan-takeoff jobs only. Measured quantities are waiting for a human to
   * confirm them into the estimate; null/false for every other extractor and
   * for jobs already confirmed. See confirmTakeoffItemsAction.
   */
  awaitingConfirmation: boolean
  /** How many quantities are waiting, so the button can say. */
  pendingItemCount: number
  /**
   * Pages in the uploaded PDF vs pages the measurement actually read.
   * worker/src/rasterize.ts caps at 20; when these differ the extraction is
   * partial and the UI has to say so. Null on jobs that predate the field.
   */
  pageCount: number | null
  pagesRead: number | null
}

// A retry inserts a new takeoff_job row rather than resetting the failed
// one in place, so a document can end up with more than one job row over
// its lifetime — this picks the one that actually reflects "what's
// happening now."
function latestJob(
  jobs: (typeof takeoffJobs.$inferSelect)[],
  documentId: string,
): (typeof takeoffJobs.$inferSelect) | undefined {
  return jobs
    .filter((j) => j.documentId === documentId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
}

// The worker (a separate process) can't call a Next.js Server Action
// directly, so there's no push from "job complete" to "estimate updated" —
// instead, whoever next loads /processing pulls every CONFIRMED job's result
// into the estimate. generateEstimateFromTakeoff replaces all
// source="ai_extracted" lines on each call, so this re-sends the combined
// items from *every* confirmed job for the project (not just the newest),
// and is safe to call on every load — same idempotent recompute-on-load
// pattern as reconciliation and rate-drift syncing elsewhere in the app.
//
// "Confirmed" is the part that changed (migration 0016). This used to sync
// every *complete* job, which meant AI-measured quantities landed in a real
// estimate with nobody having looked at them — the only extractor in the app
// that skipped the confirm click
// docs/Constimator-Client-Requirements-Todo.md requires, and the one whose
// numbers are measured off drawings rather than transcribed from a printed
// table. Confirming is a separate, explicit action now.
async function syncEstimateFromCompleteJobs(
  scopedDb: Awaited<ReturnType<typeof getScopedDb>>,
  projectId: string,
  jobs: (typeof takeoffJobs.$inferSelect)[],
) {
  // Only plan-takeoff results feed the estimate, as an allowlist rather than
  // "anything that isn't a bid form" — a bid form's items are the official
  // schedule the estimate is reconciled *against* (step 40), and a sub
  // quote's are a third party's pricing (step 41), so neither may become
  // this contractor's own estimate lines. Written as an allowlist so that
  // adding a fourth extractor can't quietly opt itself in.
  const items = jobs
    .filter((job) => job.status === "complete" && isPlanTakeoff(job) && job.itemsConfirmedAt != null)
    .flatMap((job) => job.result?.items ?? [])

  if (items.length === 0) return

  await generateEstimateFromTakeoff(projectId, items).catch((err) => {
    logger.error("Failed to sync estimate from takeoff results", { projectId }, err)
  })
}

/**
 * Every takeoff job for every document in the project.
 *
 * Project-wide on purpose, and it matters: generateEstimateFromTakeoff
 * REPLACES all source="ai_extracted" lines with whatever items it is handed,
 * so a caller that passes only one document's jobs would delete the
 * quantities confirmed from every other plan set in the project. Both
 * callers here go through this.
 */
async function loadProjectJobs(
  scopedDb: Awaited<ReturnType<typeof getScopedDb>>,
  projectId: string,
) {
  const docs = await scopedDb.documents.findMany(eq(documents.projectId, projectId))
  if (docs.length === 0) return { docs, jobs: [] as (typeof takeoffJobs.$inferSelect)[] }

  const jobs = await scopedDb.takeoffJobs.findMany(
    inArray(
      takeoffJobs.documentId,
      docs.map((doc) => doc.id),
    ),
  )
  return { docs, jobs }
}

// An absent `kind` means a plan takeoff — those rows predate the field (see
// db/schema.ts).
function isPlanTakeoff(job: typeof takeoffJobs.$inferSelect): boolean {
  return job.result?.kind === undefined || job.result.kind === "plan_takeoff"
}

function isAwaitingConfirmation(job: typeof takeoffJobs.$inferSelect | undefined): boolean {
  return (
    job != null &&
    job.status === "complete" &&
    isPlanTakeoff(job) &&
    job.itemsConfirmedAt == null &&
    (job.result?.items?.length ?? 0) > 0
  )
}

/**
 * Accepts a finished plan takeoff's measured quantities into the estimate.
 *
 * This is the confirm click that used to be missing. Nothing writes an
 * AI-measured quantity to estimate_line until a human calls this, which is
 * why the /processing page shows the item count and the page coverage next to
 * the button — a 20-of-180-sheet extraction is exactly the case where the
 * answer should be "no".
 */
export async function confirmTakeoffItemsAction(rawDocumentId: string): Promise<void> {
  const documentId = parseInput(uuidSchema, rawDocumentId)
  const scopedDb = await getScopedDb()
  requireWrite(scopedDb)

  // Org isolation via getScopedDb() means this returns undefined for another
  // org's document — same defense-in-depth pattern as every other directly
  // callable Server Action here (step 30).
  const document = await scopedDb.documents.findFirst(eq(documents.id, documentId))
  if (!document) {
    throw new Error("Document not found.")
  }

  const { jobs } = await loadProjectJobs(scopedDb, document.projectId)
  const current = latestJob(jobs, documentId)
  if (!isAwaitingConfirmation(current) || !current) {
    throw new Error("There are no extracted quantities awaiting confirmation for this document.")
  }

  await scopedDb.takeoffJobs.update(eq(takeoffJobs.id, current.id), {
    itemsConfirmedAt: new Date(),
  })

  // Re-read the whole project so the newly confirmed job is included AND the
  // already-confirmed ones are re-sent — see loadProjectJobs.
  const { jobs: refreshed } = await loadProjectJobs(scopedDb, document.projectId)
  await syncEstimateFromCompleteJobs(scopedDb, document.projectId, refreshed)
}

export async function getProcessingStatus(
  rawProjectId: string,
): Promise<ProcessingItem[]> {
  const projectId = parseInput(uuidSchema, rawProjectId)
  const scopedDb = await getScopedDb()
  const { docs, jobs } = await loadProjectJobs(scopedDb, projectId)
  if (docs.length === 0) return []

  await syncEstimateFromCompleteJobs(scopedDb, projectId, jobs)

  return docs.map((doc) => {
    const job = latestJob(jobs, doc.id)
    return {
      documentId: doc.id,
      fileName: doc.fileName,
      status: job?.status ?? "not_queued",
      error: job?.error ?? null,
      kind: job?.result?.kind ?? null,
      awaitingConfirmation: isAwaitingConfirmation(job),
      pendingItemCount: job?.result?.items?.length ?? 0,
      pageCount: job?.result?.pageCount ?? null,
      pagesRead: job?.result?.pagesRead ?? null,
    }
  })
}

export async function retryTakeoffJobAction(rawDocumentId: string): Promise<void> {
  const documentId = parseInput(uuidSchema, rawDocumentId)
  const scopedDb = await getScopedDb()
  requireWrite(scopedDb)

  // Org isolation via getScopedDb() means this returns undefined for a
  // document id from a different org — same defense-in-depth pattern as
  // every other directly-callable Server Action here (step 30).
  const document = await scopedDb.documents.findFirst(eq(documents.id, documentId))
  if (!document) {
    throw new Error("Document not found.")
  }

  const jobs = await scopedDb.takeoffJobs.findMany(eq(takeoffJobs.documentId, documentId))
  const current = latestJob(jobs, documentId)
  if (current?.status !== "failed") {
    throw new Error("Only a failed document can be retried.")
  }

  await queueTakeoffJob(scopedDb, documentId)
}
