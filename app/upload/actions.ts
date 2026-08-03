"use server"

import { randomUUID } from "node:crypto"

import { eq } from "drizzle-orm"
import { z } from "zod"

import { documents, projects } from "@/db/schema"
import { checkSpendCap, checkTakeoffRateLimit, formatUsd } from "@/lib/ai-limits"
import { getScopedDb } from "@/lib/db/scoped"
import { logger } from "@/lib/logger"
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server"
import { parseInput, uuidSchema } from "@/lib/validation"

const DOCUMENTS_BUCKET = "project-documents"

// Also enforced at the Supabase Storage bucket level (db/storage-setup.sql)
// — checked here too so a rejected file gets a clean error message instead
// of a raw Storage API failure, without spending a signed-URL round trip.
const ALLOWED_MIME_TYPES = ["application/pdf"] as const
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024

const docTypeSchema = z.enum(["plans", "specifications", "bid_form", "addendum", "other"])
export type DbDocType = z.infer<typeof docTypeSchema>

const requestUploadSchema = z.object({
  projectId: uuidSchema,
  fileName: z.string().trim().min(1, "File name is required"),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE_BYTES, "Files must be 500 MB or smaller."),
  mimeType: z.enum(ALLOWED_MIME_TYPES, "Only PDF files are allowed."),
})

export async function requestDocumentUpload(rawInput: {
  projectId: string
  fileName: string
  fileSize: number
  mimeType: string
}) {
  const input = parseInput(requestUploadSchema, rawInput)

  const scopedDb = await getScopedDb()
  // Org isolation via getScopedDb() means this returns undefined for a
  // project id from a different org, not another org's project.
  const project = await scopedDb.projects.findFirst(
    eq(projects.id, input.projectId),
  )
  if (!project) {
    throw new Error("Project not found.")
  }

  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const path = `${scopedDb.orgId}/${input.projectId}/${randomUUID()}-${safeName}`

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUploadUrl(path)

  if (error || !data) {
    throw new Error(error?.message ?? "Could not prepare upload.")
  }

  return { signedUrl: data.signedUrl, path }
}

const confirmUploadSchema = z.object({
  projectId: uuidSchema,
  path: z.string().trim().min(1, "Storage path is required"),
  fileName: z.string().trim().min(1, "File name is required"),
  mimeType: z.enum(ALLOWED_MIME_TYPES, "Only PDF files are allowed."),
  fileSizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE_BYTES, "Files must be 500 MB or smaller."),
  type: docTypeSchema,
})

export async function confirmDocumentUpload(rawInput: {
  projectId: string
  path: string
  fileName: string
  mimeType: string
  fileSizeBytes: number
  type: DbDocType
}) {
  const input = parseInput(confirmUploadSchema, rawInput)
  const scopedDb = await getScopedDb()

  // Found during the step 30 security review: requestDocumentUpload (just
  // above) already checks this before handing back a signed upload URL,
  // but confirmDocumentUpload is its own separately-callable Server
  // Action — calling it directly with another org's project id, skipping
  // requestDocumentUpload entirely, inserted a document row referencing
  // that project via the foreign key. The row itself is still stamped
  // with the caller's own org (documents.insert always does that), so
  // nothing readable leaked — but it's a real cross-tenant reference an
  // attacker could trigger, same class of bug as
  // lib/current-project.ts's getOrCreateCurrentEstimate.
  const project = await scopedDb.projects.findFirst(
    eq(projects.id, input.projectId),
  )
  if (!project) {
    throw new Error("Project not found.")
  }

  // Found during the step 30 security review, and the most serious issue
  // it turned up: without this, an org could call confirmDocumentUpload
  // directly with a `path` pointing at ANOTHER org's real storage object
  // (Supabase Storage paths are predictable — "{org_id}/{project_id}/
  // {uuid}-{filename}" — and reusing a previously-seen one is exactly the
  // "reuse IDs" scenario this review was asked to test). The resulting
  // document row would be stamped with the caller's own org (so nothing
  // in *this* table leaks by itself), but worker/src/download-document.ts
  // downloads whatever storage_path a queued job's document row says,
  // using the service-role key — which bypasses Storage's own RLS
  // entirely. That combination would let an attacker get the worker to
  // download and AI-extract another org's real document and read the
  // result back through their own account. Requiring the path to be
  // under the caller's own org prefix closes this at the one point that
  // actually creates the row, rather than trying to re-derive trust in
  // the worker (which has no session to check against anyway).
  const expectedPrefix = `${scopedDb.orgId}/`
  if (!input.path.startsWith(expectedPrefix)) {
    throw new Error("Storage path does not belong to your organization.")
  }

  const [document] = await scopedDb.documents.insert({
    projectId: input.projectId,
    type: input.type,
    fileName: input.fileName,
    storageBucket: DOCUMENTS_BUCKET,
    storagePath: input.path,
    mimeType: input.mimeType,
    fileSizeBytes: input.fileSizeBytes,
    status: "uploaded",
  })

  // Queued for the standalone worker (worker/) to pick up — this returns
  // immediately rather than running takeoff extraction inline, since that
  // can be a slow multi-page PDF job and this is a Vercel function with a
  // execution time limit. See worker/src/process-job.ts (step 16) for what
  // actually processes this.
  //
  // Step 25: this is "the takeoff-triggering endpoint" — the queue-time
  // check. It's not the authoritative one (the worker repeats both checks
  // immediately before the paid Claude call, since that's where money is
  // actually spent and a job could sit queued across a rate-limit window
  // or into a new spend-cap month) — but failing fast here means a blocked
  // request doesn't even take up a worker poll cycle, and the reason shows
  // up immediately on /processing instead of after a wasted round trip.
  try {
    const rateLimit = await checkTakeoffRateLimit(scopedDb.orgId)
    if (!rateLimit.allowed) {
      await scopedDb.takeoffJobs.insert({
        documentId: document.id,
        status: "failed",
        error: `Too many takeoff requests — please wait about ${rateLimit.retryAfterSeconds}s and try again.`,
      })
      return document
    }

    const spendCap = await checkSpendCap(scopedDb)
    if (spendCap.overCap) {
      await scopedDb.takeoffJobs.insert({
        documentId: document.id,
        status: "failed",
        error: `Your organization has reached its monthly AI usage limit (${formatUsd(spendCap.capUsd)} used this month). AI document processing is paused until next month — you can still upload documents and build your estimate manually.`,
      })
      return document
    }

    await scopedDb.takeoffJobs.insert({
      documentId: document.id,
      status: "queued",
    })
  } catch (err) {
    logger.error("Failed to queue takeoff job", { documentId: document.id }, err)
  }

  return document
}

export async function updateDocumentType(documentId: string, type: DbDocType) {
  const validDocumentId = parseInput(uuidSchema, documentId)
  const validType = parseInput(docTypeSchema, type)
  const scopedDb = await getScopedDb()
  await scopedDb.documents.update(eq(documents.id, validDocumentId), { type: validType })
}

export async function removeDocument(documentId: string) {
  const validDocumentId = parseInput(uuidSchema, documentId)
  const scopedDb = await getScopedDb()
  const document = await scopedDb.documents.findFirst(
    eq(documents.id, validDocumentId),
  )
  if (!document) return

  const supabase = await createSupabaseServerClient()
  await supabase.storage
    .from(document.storageBucket)
    .remove([document.storagePath])

  await scopedDb.documents.delete(eq(documents.id, validDocumentId))
}
