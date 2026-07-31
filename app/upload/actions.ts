"use server"

import { randomUUID } from "node:crypto"

import { eq } from "drizzle-orm"

import { documents, projects } from "@/db/schema"
import { getScopedDb } from "@/lib/db/scoped"
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server"

const DOCUMENTS_BUCKET = "project-documents"

// Also enforced at the Supabase Storage bucket level (db/storage-setup.sql)
// — checked here too so a rejected file gets a clean error message instead
// of a raw Storage API failure, without spending a signed-URL round trip.
const ALLOWED_MIME_TYPES = ["application/pdf"]
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024

export type DbDocType =
  | "plans"
  | "specifications"
  | "bid_form"
  | "addendum"
  | "other"

export async function requestDocumentUpload(input: {
  projectId: string
  fileName: string
  fileSize: number
  mimeType: string
}) {
  if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
    throw new Error("Only PDF files are allowed.")
  }
  if (input.fileSize > MAX_FILE_SIZE_BYTES) {
    throw new Error("Files must be 500 MB or smaller.")
  }

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

export async function confirmDocumentUpload(input: {
  projectId: string
  path: string
  fileName: string
  mimeType: string
  fileSizeBytes: number
  type: DbDocType
}) {
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

  return document
}

export async function updateDocumentType(documentId: string, type: DbDocType) {
  const scopedDb = await getScopedDb()
  await scopedDb.documents.update(eq(documents.id, documentId), { type })
}

export async function removeDocument(documentId: string) {
  const scopedDb = await getScopedDb()
  const document = await scopedDb.documents.findFirst(
    eq(documents.id, documentId),
  )
  if (!document) return

  const supabase = await createSupabaseServerClient()
  await supabase.storage
    .from(document.storageBucket)
    .remove([document.storagePath])

  await scopedDb.documents.delete(eq(documents.id, documentId))
}
