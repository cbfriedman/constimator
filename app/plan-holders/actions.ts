"use server"

import { eq } from "drizzle-orm"
import { z } from "zod"

import {
  documents,
  planHolderContacts,
  planHolderListStatusEnum,
  planHolderLists,
  takeoffJobs,
} from "@/db/schema"
import { removeDocument } from "@/app/upload/actions"
import { captureEvent } from "@/lib/analytics"
import { getScopedDb } from "@/lib/db/scoped"
import {
  assertPathInOrg,
  assertProjectInOrg,
  createSignedDocumentUpload,
  DOCUMENTS_BUCKET,
  MAX_FILE_SIZE_BYTES,
  PDF_MIME_TYPES,
} from "@/lib/document-upload"
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server"
import { queueTakeoffJob } from "@/lib/takeoff-queue"
import { parseInput, uuidSchema } from "@/lib/validation"

// A plan holders list is uploaded here rather than through
// app/upload/actions.ts for the same reason a sub quote is: it needs a field
// recorded with the file that the generic uploader has nowhere to ask for.
// Here that field is sourceLabel — agencies reissue the roster as more
// bidders pull documents, and the only thing distinguishing the 3/14 issue
// from the 3/21 one is what a human calls it. The extractor reads a printed
// date when there is one, but plenty of rosters carry none at all, so the
// label is required rather than inferred.

const fileSchema = {
  fileName: z.string().trim().min(1, "File name is required"),
  fileSizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE_BYTES, "Files must be 500 MB or smaller."),
  // PDF only, unlike a sub quote. A sub quote is as likely to be a phone
  // photo of a fax as a file; a plan holders list is something an agency
  // published, and the extractor sends it to Claude as a PDF document block.
  mimeType: z.enum(PDF_MIME_TYPES, "Plan holder lists must be a PDF."),
}

const requestPlanHolderUploadSchema = z.object({
  projectId: uuidSchema,
  fileName: fileSchema.fileName,
  fileSize: fileSchema.fileSizeBytes,
  mimeType: fileSchema.mimeType,
})

export async function requestPlanHolderUpload(rawInput: {
  projectId: string
  fileName: string
  fileSize: number
  mimeType: string
}) {
  const input = parseInput(requestPlanHolderUploadSchema, rawInput)
  const scopedDb = await getScopedDb()

  return createSignedDocumentUpload(scopedDb, input.projectId, input.fileName)
}

const confirmPlanHolderUploadSchema = z.object({
  projectId: uuidSchema,
  path: z.string().trim().min(1, "Storage path is required"),
  fileName: fileSchema.fileName,
  fileSizeBytes: fileSchema.fileSizeBytes,
  mimeType: fileSchema.mimeType,
  sourceLabel: z.string().trim().min(1, "A label is required").max(200),
})

export async function confirmPlanHolderUpload(rawInput: {
  projectId: string
  path: string
  fileName: string
  fileSizeBytes: number
  mimeType: string
  sourceLabel: string
}) {
  const input = parseInput(confirmPlanHolderUploadSchema, rawInput)
  const scopedDb = await getScopedDb()

  // Re-checked here for the same reason the other uploaders re-check them:
  // this is its own separately-callable Server Action, reachable without
  // going through the request step at all. See lib/document-upload.ts.
  await assertProjectInOrg(scopedDb, input.projectId)
  assertPathInOrg(scopedDb, input.path)

  const [document] = await scopedDb.documents.insert({
    projectId: input.projectId,
    type: "plan_holders",
    fileName: input.fileName,
    storageBucket: DOCUMENTS_BUCKET,
    storagePath: input.path,
    mimeType: input.mimeType,
    fileSizeBytes: input.fileSizeBytes,
    status: "uploaded",
  })

  const [list] = await scopedDb.planHolderLists.insert({
    projectId: input.projectId,
    documentId: document.id,
    sourceLabel: input.sourceLabel,
    status: "uploaded",
    uploadedBy: scopedDb.userId,
  })

  await captureEvent("plan_holder_list_uploaded", {
    userId: scopedDb.userId,
    orgId: scopedDb.orgId,
    properties: {
      planHolderListId: list.id,
      documentId: document.id,
      projectId: input.projectId,
    },
  })

  // Same queue, worker, spend cap, and rate limit as every other document —
  // worker/src/process-job.ts routes on document.type to decide this one goes
  // to the plan holders extractor.
  await queueTakeoffJob(scopedDb, document.id)

  return list
}

export async function removePlanHolderList(rawListId: string): Promise<void> {
  const listId = parseInput(uuidSchema, rawListId)
  const scopedDb = await getScopedDb()

  const list = await scopedDb.planHolderLists.findFirst(
    eq(planHolderLists.id, listId),
  )
  if (!list) {
    throw new Error("Plan holder list not found.")
  }

  // Delegates to removeDocument rather than deleting the plan_holder_list row
  // directly: that's what also removes the file from Storage, and deleting
  // the document cascades to this list and its contacts (see the foreign keys
  // in db/schema.ts). The other way round strands the file in the bucket with
  // nothing left pointing at it.
  await removeDocument(list.documentId)
}

// ---------------------------------------------------------------------------
// Review & confirm.
//
// The worker writes its extraction onto takeoff_job.result and stops; it's a
// separate process and can't call a Server Action. So, exactly as
// app/sub-quotes/actions.ts does for quote conditions, whoever next loads the
// review screen pulls any complete result into the domain tables. Same
// idempotent recompute-on-load pattern, and the same hard rule: it must never
// overwrite what a human has already confirmed, so it only ever writes
// contacts for a list that has none yet.
// ---------------------------------------------------------------------------

/**
 * A timestamp column can come back as a Date or as a string depending on the
 * driver path, and `.getTime()` on the string form throws — the same coercion
 * lib/activity.ts and app/sub-quotes/actions.ts needed. Sorting is the only
 * thing that reads these, and a sort that throws takes the whole page with it.
 */
function timestampMs(value: Date | string | number | null | undefined): number {
  if (value == null) return Number.NaN
  if (typeof value === "number") return value
  const date = value instanceof Date ? value : new Date(value)
  return date.getTime()
}

async function syncContactsFromExtraction(
  scopedDb: Awaited<ReturnType<typeof getScopedDb>>,
  list: typeof planHolderLists.$inferSelect,
): Promise<void> {
  const existing = await scopedDb.planHolderContacts.findMany(
    eq(planHolderContacts.planHolderListId, list.id),
  )
  // Already materialised. Re-syncing would mean deleting rows a human may
  // have confirmed or corrected, to replace them with the AI's original
  // reading — silently undoing exactly the work this screen exists to capture.
  if (existing.length > 0) return

  const jobs = await scopedDb.takeoffJobs.findMany(
    eq(takeoffJobs.documentId, list.documentId),
  )
  const latestComplete = jobs
    .filter(
      (job) => job.status === "complete" && job.result?.kind === "plan_holders",
    )
    .sort((a, b) => timestampMs(b.createdAt) - timestampMs(a.createdAt))[0]

  if (!latestComplete) return

  const extracted = latestComplete.result?.planHolders ?? []
  if (extracted.length > 0) {
    await scopedDb.planHolderContacts.insertMany(
      extracted.map((holder) => ({
        planHolderListId: list.id,
        rawText: holder.rawText,
        companyName: holder.companyName,
        contactName: holder.contactName ?? null,
        email: holder.email ?? null,
        phone: holder.phone ?? null,
        address: holder.address ?? null,
        city: holder.city ?? null,
        state: holder.state ?? null,
        postalCode: holder.postalCode ?? null,
        licenseNumber: holder.licenseNumber ?? null,
        confidence: holder.confidence == null ? null : String(holder.confidence),
        notes: holder.notes ?? null,
        sourcePage: holder.sourcePage ?? null,
        // matchStatus stays at its "unmatched" default. Nothing resolves
        // these against a contractor registry yet — see
        // planHolderMatchStatusEnum in db/schema.ts for what has to exist
        // first, and why this is a seam rather than an oversight.
      })),
    )
  }

  await scopedDb.planHolderLists.update(eq(planHolderLists.id, list.id), {
    issuedOn: parseIssuedOn(latestComplete.result?.planHoldersIssuedOn),
    documentNotes: latestComplete.result?.documentNotes ?? list.documentNotes,
    status: extracted.length > 0 ? "needs_review" : list.status,
    updatedAt: new Date(),
  })
}

/**
 * The extractor is told to send ISO yyyy-mm-dd, but it's a language model
 * reading a date off a badly formatted roster — an unparseable string is a
 * thing that happens, and it must not take the review screen down. An
 * undated list is normal and already supported, so a bad date degrades to
 * exactly that.
 */
function parseIssuedOn(raw: string | undefined): Date | null {
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export type PlanHolderContactView = {
  id: string
  rawText: string
  companyName: string
  contactName: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  licenseNumber: string | null
  confidence: number | null
  notes: string | null
  sourcePage: number | null
  matchStatus: string
  isConfirmed: boolean
  confirmedAt: string | null
}

export type PlanHolderReview = {
  list: {
    id: string
    sourceLabel: string
    issuedOn: string | null
    status: (typeof planHolderListStatusEnum.enumValues)[number]
    documentNotes: string | null
    documentId: string
    fileName: string
  }
  contacts: PlanHolderContactView[]
  progress: { confirmed: number; total: number }
  pendingReason: "extracting" | "failed" | "none_found" | null
}

/** Lowest-confidence unconfirmed rows first: those are the ones a reviewer's attention is worth most on. */
function reviewOrder(
  a: PlanHolderContactView,
  b: PlanHolderContactView,
): number {
  if (a.isConfirmed !== b.isConfirmed) return a.isConfirmed ? 1 : -1
  const aConf = a.confidence ?? Number.POSITIVE_INFINITY
  const bConf = b.confidence ?? Number.POSITIVE_INFINITY
  if (aConf !== bConf) return aConf - bConf
  return a.companyName.localeCompare(b.companyName)
}

export async function getPlanHolderReview(
  rawListId: string,
): Promise<PlanHolderReview> {
  const listId = parseInput(uuidSchema, rawListId)
  const scopedDb = await getScopedDb()

  const list = await scopedDb.planHolderLists.findFirst(
    eq(planHolderLists.id, listId),
  )
  if (!list) {
    throw new Error("Plan holder list not found.")
  }

  await syncContactsFromExtraction(scopedDb, list)

  // Sequential, not Promise.all: lib/db/client.ts caps the postgres.js pool
  // at max: 1 (set during a real production outage), and the root layout is
  // already querying on the same client during this render. Running these
  // concurrently contends for that single connection.
  const fresh = await scopedDb.planHolderLists.findFirst(
    eq(planHolderLists.id, listId),
  )
  const rows = await scopedDb.planHolderContacts.findMany(
    eq(planHolderContacts.planHolderListId, listId),
  )
  const document = await scopedDb.documents.findFirst(
    eq(documents.id, list.documentId),
  )

  const contacts: PlanHolderContactView[] = rows
    .map((row) => ({
      id: row.id,
      rawText: row.rawText,
      companyName: row.companyName,
      contactName: row.contactName,
      email: row.email,
      phone: row.phone,
      address: row.address,
      city: row.city,
      state: row.state,
      postalCode: row.postalCode,
      licenseNumber: row.licenseNumber,
      confidence: row.confidence == null ? null : Number(row.confidence),
      notes: row.notes,
      sourcePage: row.sourcePage,
      matchStatus: row.matchStatus,
      isConfirmed: row.isConfirmed,
      confirmedAt: row.confirmedAt ? new Date(row.confirmedAt).toISOString() : null,
    }))
    .sort(reviewOrder)

  const status = fresh?.status ?? list.status
  const pendingReason =
    contacts.length > 0
      ? null
      : status === "failed"
        ? "failed"
        : status === "uploaded" || status === "extracting"
          ? "extracting"
          : "none_found"

  return {
    list: {
      id: list.id,
      sourceLabel: list.sourceLabel,
      issuedOn: fresh?.issuedOn ? new Date(fresh.issuedOn).toISOString() : null,
      status,
      documentNotes: fresh?.documentNotes ?? list.documentNotes,
      documentId: list.documentId,
      fileName: document?.fileName ?? "Document",
    },
    contacts,
    progress: {
      confirmed: contacts.filter((contact) => contact.isConfirmed).length,
      total: contacts.length,
    },
    pendingReason,
  }
}

/**
 * A list is "confirmed" only once every row on it is. Recomputed from the
 * rows rather than tracked separately, so it can't drift — same approach as
 * refreshSubQuoteStatus in app/sub-quotes/actions.ts.
 */
async function refreshListStatus(
  scopedDb: Awaited<ReturnType<typeof getScopedDb>>,
  listId: string,
): Promise<void> {
  const rows = await scopedDb.planHolderContacts.findMany(
    eq(planHolderContacts.planHolderListId, listId),
  )
  if (rows.length === 0) return

  const allConfirmed = rows.every((row) => row.isConfirmed)
  await scopedDb.planHolderLists.update(eq(planHolderLists.id, listId), {
    status: allConfirmed ? "confirmed" : "needs_review",
    updatedAt: new Date(),
  })
}

export async function confirmPlanHolderAction(rawId: string): Promise<void> {
  const id = parseInput(uuidSchema, rawId)
  const scopedDb = await getScopedDb()

  const [updated] = await scopedDb.planHolderContacts.update(
    eq(planHolderContacts.id, id),
    {
      isConfirmed: true,
      confirmedBy: scopedDb.userId,
      confirmedAt: new Date(),
      updatedAt: new Date(),
    },
  )
  if (!updated) throw new Error("Plan holder not found.")

  await refreshListStatus(scopedDb, updated.planHolderListId)
}

/** Undo, for a row confirmed by mistake. Clears the attribution too — a stale one is worse than none. */
export async function unconfirmPlanHolderAction(rawId: string): Promise<void> {
  const id = parseInput(uuidSchema, rawId)
  const scopedDb = await getScopedDb()

  const [updated] = await scopedDb.planHolderContacts.update(
    eq(planHolderContacts.id, id),
    {
      isConfirmed: false,
      confirmedBy: null,
      confirmedAt: null,
      updatedAt: new Date(),
    },
  )
  if (!updated) throw new Error("Plan holder not found.")

  await refreshListStatus(scopedDb, updated.planHolderListId)
}

const updatePlanHolderSchema = z.object({
  id: uuidSchema,
  companyName: z.string().trim().min(1, "Company name is required").max(200),
  contactName: z.string().trim().max(200).nullable(),
  email: z.string().trim().max(320).nullable(),
  phone: z.string().trim().max(60).nullable(),
  licenseNumber: z.string().trim().max(60).nullable(),
})

/**
 * Correcting a parse. Confirming is a separate action on purpose: an edit is
 * a reviewer saying "this is what the roster says", which is exactly the
 * assertion confirmation records, so this marks the row confirmed in the same
 * write rather than asking for a second click on a row just corrected.
 *
 * Editing does NOT touch rawText — that's the verbatim source line, and the
 * whole point of keeping it is that it stays what the document said even
 * after someone fixes the parse.
 */
export async function updatePlanHolderAction(rawInput: {
  id: string
  companyName: string
  contactName: string | null
  email: string | null
  phone: string | null
  licenseNumber: string | null
}): Promise<void> {
  const input = parseInput(updatePlanHolderSchema, rawInput)
  const scopedDb = await getScopedDb()

  const [updated] = await scopedDb.planHolderContacts.update(
    eq(planHolderContacts.id, input.id),
    {
      companyName: input.companyName,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      licenseNumber: input.licenseNumber,
      // A human-corrected licence number invalidates any registry match that
      // was made off the old one. Nothing sets these yet, but resetting the
      // seam here means the backfill can't later find a "matched" row whose
      // licence number no longer matches what it matched on.
      matchStatus: "unmatched",
      contractorId: null,
      matchConfidence: null,
      isConfirmed: true,
      confirmedBy: scopedDb.userId,
      confirmedAt: new Date(),
      updatedAt: new Date(),
    },
  )
  if (!updated) throw new Error("Plan holder not found.")

  await refreshListStatus(scopedDb, updated.planHolderListId)
}

const REVIEW_DOCUMENT_URL_TTL_SECONDS = 15 * 60

/**
 * A signed URL for the source roster, so a reviewer can open the original
 * when a rawText line isn't enough to settle a row.
 *
 * Deliberately a link rather than the inline PDF pane the sub quote review
 * screen has. That pane (components/sub-quotes/document-pane.tsx) takes a
 * subQuoteId and calls getSubQuoteDocumentUrl directly, so reusing it here
 * would mean refactoring it to accept a loader — worth doing when a second
 * screen genuinely needs the highlight-the-source behaviour, which this one
 * doesn't: a plan holders row carries its whole source line in rawText, right
 * next to the parsed fields.
 */
export async function getPlanHolderDocumentUrl(
  rawListId: string,
): Promise<string> {
  const listId = parseInput(uuidSchema, rawListId)
  const scopedDb = await getScopedDb()

  const list = await scopedDb.planHolderLists.findFirst(
    eq(planHolderLists.id, listId),
  )
  if (!list) {
    throw new Error("Plan holder list not found.")
  }

  const document = await scopedDb.documents.findFirst(
    eq(documents.id, list.documentId),
  )
  if (!document) {
    throw new Error("Document not found.")
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.storage
    .from(document.storageBucket)
    .createSignedUrl(document.storagePath, REVIEW_DOCUMENT_URL_TTL_SECONDS)

  if (error || !data) {
    throw new Error(error?.message ?? "Could not open this document.")
  }
  return data.signedUrl
}

export type PlanHolderListItem = {
  id: string
  sourceLabel: string
  issuedOn: string | null
  status: (typeof planHolderListStatusEnum.enumValues)[number]
  holderCount: number
  confirmedCount: number
}

export async function listPlanHolderListsForReview(
  rawProjectId: string,
): Promise<PlanHolderListItem[]> {
  const projectId = parseInput(uuidSchema, rawProjectId)
  const scopedDb = await getScopedDb()

  const lists = await scopedDb.planHolderLists.findMany(
    eq(planHolderLists.projectId, projectId),
  )

  const items: PlanHolderListItem[] = []
  for (const list of lists) {
    // Sequential for the same max: 1 pool reason as getPlanHolderReview.
    const rows = await scopedDb.planHolderContacts.findMany(
      eq(planHolderContacts.planHolderListId, list.id),
    )
    items.push({
      id: list.id,
      sourceLabel: list.sourceLabel,
      issuedOn: list.issuedOn ? new Date(list.issuedOn).toISOString() : null,
      status: list.status,
      holderCount: rows.length,
      confirmedCount: rows.filter((row) => row.isConfirmed).length,
    })
  }

  // Lists needing review first, then newest issue first — the roster closest
  // to bid day is the one that matters.
  return items.sort((a, b) => {
    const aDone = a.status === "confirmed"
    const bDone = b.status === "confirmed"
    if (aDone !== bDone) return aDone ? 1 : -1
    return timestampMs(b.issuedOn) - timestampMs(a.issuedOn) || 0
  })
}
