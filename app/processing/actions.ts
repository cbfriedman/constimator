"use server"

import { eq, inArray } from "drizzle-orm"

import { documents, takeoffJobs } from "@/db/schema"
import { getScopedDb } from "@/lib/db/scoped"

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

export async function getProcessingStatus(
  projectId: string,
): Promise<ProcessingItem[]> {
  const scopedDb = await getScopedDb()
  const docs = await scopedDb.documents.findMany(eq(documents.projectId, projectId))
  if (docs.length === 0) return []

  const jobs = await scopedDb.takeoffJobs.findMany(
    inArray(
      takeoffJobs.documentId,
      docs.map((doc) => doc.id),
    ),
  )

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
