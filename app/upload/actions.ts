"use server"


import { eq } from "drizzle-orm"
import { z } from "zod"

import { documentTypeEnum, documents } from "@/db/schema"
import { captureEvent } from "@/lib/analytics"
import { getScopedDb } from "@/lib/db/scoped"
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server"
import {
  assertPathInOrg,
  assertProjectInOrg,
  createSignedDocumentUpload,
  DOCUMENTS_BUCKET,
  MAX_FILE_SIZE_BYTES,
  PDF_MIME_TYPES,
} from "@/lib/document-upload"
import { queueTakeoffJob } from "@/lib/takeoff-queue"
import { parseInput, uuidSchema } from "@/lib/validation"

// The bucket name, size cap, and both org checks live in
// lib/document-upload.ts — shared with the sub-quote uploader (step 41) so
// the two paths can't drift apart on the checks the step 30 security review
// put there.
const ALLOWED_MIME_TYPES = PDF_MIME_TYPES

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

  return createSignedDocumentUpload(scopedDb, input.projectId, input.fileName)
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

  // Both re-checked here even though requestDocumentUpload already checked
  // them: this is its own separately-callable Server Action, reachable
  // without ever going through the request step. See lib/document-upload.ts
  // for what each one prevents.
  await assertProjectInOrg(scopedDb, input.projectId)
  assertPathInOrg(scopedDb, input.path)

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
