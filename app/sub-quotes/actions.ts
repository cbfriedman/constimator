"use server"

import { eq } from "drizzle-orm"
import { z } from "zod"

import { subQuotes } from "@/db/schema"
import { removeDocument } from "@/app/upload/actions"
import { captureEvent } from "@/lib/analytics"
import { getScopedDb } from "@/lib/db/scoped"
import {
  assertPathInOrg,
  assertProjectInOrg,
  createSignedDocumentUpload,
  DOCUMENTS_BUCKET,
  MAX_FILE_SIZE_BYTES,
  SUB_QUOTE_MIME_TYPES,
} from "@/lib/document-upload"
import { queueTakeoffJob } from "@/lib/takeoff-queue"
import { parseInput, uuidSchema } from "@/lib/validation"

// Step 41. A sub quote is uploaded here rather than through
// app/upload/actions.ts because it needs the sub's name and trade recorded
// with the file — a sub quote with neither is a document nobody can put in a
// comparison grid, so both are required rather than inferred. The AI can
// usually read a company name off the letterhead, but a quote silently
// attributed to the wrong sub is a worse failure than a required field.

const fileSchema = {
  fileName: z.string().trim().min(1, "File name is required"),
  fileSizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE_BYTES, "Files must be 500 MB or smaller."),
  mimeType: z.enum(
    SUB_QUOTE_MIME_TYPES,
    "Sub quotes must be a PDF, JPG, or PNG.",
  ),
}

const requestSubQuoteUploadSchema = z.object({
  projectId: uuidSchema,
  fileName: fileSchema.fileName,
  fileSize: fileSchema.fileSizeBytes,
  mimeType: fileSchema.mimeType,
})

export async function requestSubQuoteUpload(rawInput: {
  projectId: string
  fileName: string
  fileSize: number
  mimeType: string
}) {
  const input = parseInput(requestSubQuoteUploadSchema, rawInput)
  const scopedDb = await getScopedDb()

  return createSignedDocumentUpload(scopedDb, input.projectId, input.fileName)
}

const confirmSubQuoteUploadSchema = z.object({
  projectId: uuidSchema,
  path: z.string().trim().min(1, "Storage path is required"),
  fileName: fileSchema.fileName,
  fileSizeBytes: fileSchema.fileSizeBytes,
  mimeType: fileSchema.mimeType,
  subName: z.string().trim().min(1, "Subcontractor name is required").max(200),
  trade: z.string().trim().min(1, "Trade is required").max(120),
})

export async function confirmSubQuoteUpload(rawInput: {
  projectId: string
  path: string
  fileName: string
  fileSizeBytes: number
  mimeType: string
  subName: string
  trade: string
}) {
  const input = parseInput(confirmSubQuoteUploadSchema, rawInput)
  const scopedDb = await getScopedDb()

  // Re-checked here for the same reason the general uploader re-checks them:
  // this is its own separately-callable Server Action, reachable without
  // going through the request step at all. See lib/document-upload.ts.
  await assertProjectInOrg(scopedDb, input.projectId)
  assertPathInOrg(scopedDb, input.path)

  const [document] = await scopedDb.documents.insert({
    projectId: input.projectId,
    type: "sub_quote",
    fileName: input.fileName,
    storageBucket: DOCUMENTS_BUCKET,
    storagePath: input.path,
    mimeType: input.mimeType,
    fileSizeBytes: input.fileSizeBytes,
    status: "uploaded",
  })

  const [subQuote] = await scopedDb.subQuotes.insert({
    projectId: input.projectId,
    documentId: document.id,
    subName: input.subName,
    trade: input.trade,
    status: "uploaded",
    uploadedBy: scopedDb.userId,
  })

  await captureEvent("sub_quote_uploaded", {
    userId: scopedDb.userId,
    orgId: scopedDb.orgId,
    properties: {
      subQuoteId: subQuote.id,
      documentId: document.id,
      projectId: input.projectId,
      trade: input.trade,
      mimeType: input.mimeType,
    },
  })

  // Same queue, worker, spend cap, and rate limit as every other document —
  // worker/src/process-job.ts routes on document.type to decide that this one
  // goes to the conditions extractor.
  await queueTakeoffJob(scopedDb, document.id)

  return subQuote
}

export async function listSubQuotes(rawProjectId: string) {
  const projectId = parseInput(uuidSchema, rawProjectId)
  const scopedDb = await getScopedDb()
  return scopedDb.subQuotes.findMany(eq(subQuotes.projectId, projectId))
}

export async function removeSubQuote(rawSubQuoteId: string): Promise<void> {
  const subQuoteId = parseInput(uuidSchema, rawSubQuoteId)
  const scopedDb = await getScopedDb()

  const subQuote = await scopedDb.subQuotes.findFirst(eq(subQuotes.id, subQuoteId))
  if (!subQuote) {
    throw new Error("Sub quote not found.")
  }

  // Delegates to removeDocument rather than deleting the sub_quote row
  // directly: that's what also removes the file from Storage, and deleting
  // the document cascades to this sub_quote and its conditions (see the
  // foreign keys in db/schema.ts). Doing it the other way round would strand
  // the uploaded file in the bucket with nothing left pointing at it.
  await removeDocument(subQuote.documentId)
}
