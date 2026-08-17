"use server"

import { eq, inArray } from "drizzle-orm"

import { generateEstimateFromTakeoff } from "@/app/estimate/actions"
import { documents, takeoffJobs } from "@/db/schema"
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
// instead, whoever next loads /processing pulls every complete job's
// result into the estimate. generateEstimateFromTakeoff replaces all
// source="ai_extracted" lines on each call, so this re-sends the combined
// items from *every* complete job for the project (not just the newest),
// and is safe to call on every load — same idempotent recompute-on-load
// pattern as reconciliation and rate-drift syncing elsewhere in the app.
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
  // adding a fourth extractor can't quietly opt itself in. An absent `kind`
  // means a plan takeoff — those rows predate the field (see db/schema.ts).
  const items = jobs
    .filter(
      (job) =>
        job.status === "complete" &&
        (job.result?.kind === undefined || job.result.kind === "plan_takeoff"),
    )
    .flatMap((job) => job.result?.items ?? [])

  if (items.length === 0) return

  await generateEstimateFromTakeoff(projectId, items).catch((err) => {
    logger.error("Failed to sync estimate from takeoff results", { projectId }, err)
  })
}

export async function getProcessingStatus(
  rawProjectId: string,
): Promise<ProcessingItem[]> {
  const projectId = parseInput(uuidSchema, rawProjectId)
  const scopedDb = await getScopedDb()
  const docs = await scopedDb.documents.findMany(eq(documents.projectId, projectId))
  if (docs.length === 0) return []

  const jobs = await scopedDb.takeoffJobs.findMany(
    inArray(
      takeoffJobs.documentId,
      docs.map((doc) => doc.id),
    ),
  )

  await syncEstimateFromCompleteJobs(scopedDb, projectId, jobs)

  return docs.map((doc) => {
    const job = latestJob(jobs, doc.id)
    return {
      documentId: doc.id,
      fileName: doc.fileName,
      status: job?.status ?? "not_queued",
      error: job?.error ?? null,
    }
  })
}

export async function retryTakeoffJobAction(rawDocumentId: string): Promise<void> {
  const documentId = parseInput(uuidSchema, rawDocumentId)
  const scopedDb = await getScopedDb()

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
