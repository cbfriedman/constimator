"use server"

import { eq, inArray } from "drizzle-orm"

import { generateEstimateFromTakeoff } from "@/app/estimate/actions"
import { documents, takeoffJobs } from "@/db/schema"
import { getScopedDb } from "@/lib/db/scoped"
import { logger } from "@/lib/logger"
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
  const items = jobs
    .filter((job) => job.status === "complete" && job.result)
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
    const job = jobs.find((j) => j.documentId === doc.id)
    return {
      documentId: doc.id,
      fileName: doc.fileName,
      status: job?.status ?? "not_queued",
      error: job?.error ?? null,
    }
  })
}
