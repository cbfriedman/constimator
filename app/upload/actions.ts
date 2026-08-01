"use server"

import { randomUUID } from "node:crypto"

import { eq } from "drizzle-orm"
import { z } from "zod"

import { documents, projects } from "@/db/schema"
import { getScopedDb } from "@/lib/db/scoped"
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
  try {
    await scopedDb.takeoffJobs.insert({
      documentId: document.id,
      status: "queued",
    })
  } catch (err) {
    console.error(`Failed to queue takeoff job for document ${document.id}:`, err)
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
