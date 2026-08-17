"use server"

import { randomUUID } from "node:crypto"

import { eq } from "drizzle-orm"
import { z } from "zod"

import { documentTypeEnum, documents, projects } from "@/db/schema"
import { captureEvent } from "@/lib/analytics"
import { getScopedDb } from "@/lib/db/scoped"
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server"
import { queueTakeoffJob } from "@/lib/takeoff-queue"
import { parseInput, uuidSchema } from "@/lib/validation"

const DOCUMENTS_BUCKET = "project-documents"

// Also enforced at the Supabase Storage bucket level (db/storage-setup.sql)
// — checked here too so a rejected file gets a clean error message instead
// of a raw Storage API failure, without spending a signed-URL round trip.
const ALLOWED_MIME_TYPES = ["application/pdf"] as const
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024

// Every value document.type can hold, derived from the column's own enum so
// the two can't drift. Use this to *read* a document's type.
export type DbDocType = (typeof documentTypeEnum.enumValues)[number]

// What this uploader is allowed to create or change a document into — a
// deliberately narrower set than DbDocType, and an allowlist rather than a
// denylist because both Server Actions below are separately callable (step
// 30). "sub_quote" is absent on purpose: a sub quote needs the sub's name
// and trade recorded alongside the file (see db/schema.ts's sub_quote), so
// creating one through this generic project-documents path would leave a
// document row with no sub_quote row behind it. Its own upload path owns
// that. Excluding it here also stops an existing sub quote's document from
// being retyped out from under its sub_quote row.
const docTypeSchema = z.enum(["plans", "specifications", "bid_form", "addendum", "other"])
export type UploadableDocType = z.infer<typeof docTypeSchema>

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
  type: UploadableDocType
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

  await captureEvent("document_uploaded", {
    userId: scopedDb.userId,
    orgId: scopedDb.orgId,
    properties: { documentId: document.id, projectId: input.projectId, docType: input.type },
  })

  // Queued for the standalone worker (worker/) to pick up — this returns
  // immediately rather than running takeoff extraction inline, since that
  // can be a slow multi-page PDF job and this is a Vercel function with a
  // execution time limit. See worker/src/process-job.ts (step 16) for what
  // actually processes this. The entitlement/rate-limit/spend-cap gate
  // lives in lib/takeoff-queue.ts, shared with retryTakeoffJobAction
  // (app/processing/actions.ts) so a retry can't skip a check the original
  // queue path enforces.
  await queueTakeoffJob(scopedDb, document.id)

  return document
}

export async function updateDocumentType(documentId: string, type: UploadableDocType) {
  const validDocumentId = parseInput(uuidSchema, documentId)
  const validType = parseInput(docTypeSchema, type)
  const scopedDb = await getScopedDb()
  await scopedDb.documents.update(eq(documents.id, validDocumentId), { type: validType })
}

export async function getDocumentViewUrlAction(documentId: string): Promise<string> {
  const validDocumentId = parseInput(uuidSchema, documentId)
  const scopedDb = await getScopedDb()
  const document = await scopedDb.documents.findFirst(eq(documents.id, validDocumentId))
  if (!document) {
    throw new Error("Document not found.")
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.storage
    .from(document.storageBucket)
    .createSignedUrl(document.storagePath, 60)

  if (error || !data) {
    throw new Error(error?.message ?? "Could not open this document.")
  }

  return data.signedUrl
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
