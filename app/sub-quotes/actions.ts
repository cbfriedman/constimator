"use server"

import { eq, inArray } from "drizzle-orm"
import { z } from "zod"

import {
  bids,
  documents,
  quoteConditionCategoryEnum,
  quoteConditions,
  subQuoteStatusEnum,
  subQuotes,
  takeoffJobs,
} from "@/db/schema"
import { removeDocument } from "@/app/upload/actions"
import { captureEvent } from "@/lib/analytics"
import { getScopedDb } from "@/lib/db/scoped"
import {
  CONDITION_CATEGORY_LABELS,
  type BidQuantity,
  type FlaggedCondition,
  type ReviewProgress,
  type ReviewableCondition,
  extractorNotesWereMuted,
  flagConditions,
  reviewProgress,
} from "@/lib/quote-review"
import {
  type ComparisonGrid,
  buildComparisonGrid,
} from "@/lib/quote-comparison"
import {
  assertPathInOrg,
  assertProjectInOrg,
  createSignedDocumentUpload,
  DOCUMENTS_BUCKET,
  MAX_FILE_SIZE_BYTES,
  SUB_QUOTE_MIME_TYPES,
} from "@/lib/document-upload"
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server"
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

// ---------------------------------------------------------------------------
// Phase 3 — review & confirm.
//
// The worker writes its extraction onto takeoff_job.result and stops; it's a
// separate process and can't call a Server Action. So, exactly as
// app/processing/actions.ts does for plan takeoffs, whoever next loads the
// review screen pulls any complete result into the domain tables. Same
// idempotent recompute-on-load pattern, one important difference: this one
// must never overwrite what a human has already confirmed, so it only ever
// writes conditions for a sub quote that has none yet.
// ---------------------------------------------------------------------------

async function syncConditionsFromExtraction(
  scopedDb: Awaited<ReturnType<typeof getScopedDb>>,
  subQuote: typeof subQuotes.$inferSelect,
): Promise<void> {
  const existing = await scopedDb.quoteConditions.findMany(
    eq(quoteConditions.subQuoteId, subQuote.id),
  )
  // Already materialised. Re-syncing would mean deleting rows a human may
  // have confirmed or corrected, to replace them with the AI's original
  // reading — silently undoing exactly the work this screen exists to capture.
  if (existing.length > 0) return

  const jobs = await scopedDb.takeoffJobs.findMany(
    eq(takeoffJobs.documentId, subQuote.documentId),
  )
  const latestComplete = jobs
    .filter((job) => job.status === "complete" && job.result?.kind === "sub_quote")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]

  if (!latestComplete) return

  const extracted = latestComplete.result?.conditions ?? []
  if (extracted.length > 0) {
    await scopedDb.quoteConditions.insertMany(
      extracted.map((condition) => ({
        subQuoteId: subQuote.id,
        category: toConditionCategory(condition.category),
        rawText: condition.rawText,
        normalizedValue: condition.normalizedValue ?? null,
        sourcePage: condition.sourcePage ?? null,
        boundingBox: condition.boundingBox ?? null,
        confidence: condition.confidence == null ? null : String(condition.confidence),
        flagReason: condition.flagReason ?? null,
      })),
    )
  }

  // The quote's bottom-line number is recorded but never marked confirmed —
  // a total is the single figure most likely to be handwritten or amended,
  // and it reaches a bid tab. It stays unconfirmed until someone clicks it.
  const total = latestComplete.result?.quoteTotalAmount
  await scopedDb.subQuotes.update(eq(subQuotes.id, subQuote.id), {
    totalAmount: total == null ? subQuote.totalAmount : String(total),
    status: extracted.length > 0 ? "needs_review" : subQuote.status,
    updatedAt: new Date(),
  })
}

/** The extractor returns a bare string; anything outside the enum lands in "other" rather than failing the whole insert. */
function toConditionCategory(
  raw: string,
): (typeof quoteConditionCategoryEnum.enumValues)[number] {
  const match = quoteConditionCategoryEnum.enumValues.find((value) => value === raw)
  return match ?? "other"
}

export type ConditionView = FlaggedCondition & {
  categoryLabel: string
  confirmedAt: string | null
}

export type SubQuoteReview = {
  subQuote: {
    id: string
    subName: string
    trade: string
    totalAmount: string | null
    totalAmountConfirmed: boolean
    status: (typeof subQuoteStatusEnum.enumValues)[number]
    documentId: string
    fileName: string
    mimeType: string | null
  }
  conditions: ConditionView[]
  progress: ReviewProgress
  notesMuted: boolean
  pendingReason: "extracting" | "failed" | "none_found" | null
}

export async function getSubQuoteReview(rawSubQuoteId: string): Promise<SubQuoteReview> {
  const subQuoteId = parseInput(uuidSchema, rawSubQuoteId)
  const scopedDb = await getScopedDb()

  const subQuote = await scopedDb.subQuotes.findFirst(eq(subQuotes.id, subQuoteId))
  if (!subQuote) {
    throw new Error("Sub quote not found.")
  }

  await syncConditionsFromExtraction(scopedDb, subQuote)

  const [fresh, rows, document, bidRows] = await Promise.all([
    scopedDb.subQuotes.findFirst(eq(subQuotes.id, subQuoteId)),
    scopedDb.quoteConditions.findMany(eq(quoteConditions.subQuoteId, subQuoteId)),
    scopedDb.documents.findFirst(eq(documents.id, subQuote.documentId)),
    scopedDb.bids.findMany(eq(bids.projectId, subQuote.projectId)),
  ])

  const reviewable: ReviewableCondition[] = rows.map((row) => ({
    id: row.id,
    category: row.category,
    rawText: row.rawText,
    normalizedValue: row.normalizedValue,
    sourcePage: row.sourcePage,
    boundingBox: row.boundingBox ?? null,
    confidence: row.confidence == null ? null : Number(row.confidence),
    flagReason: row.flagReason,
    isConfirmed: row.isConfirmed,
  }))

  const bidQuantities: BidQuantity[] = bidRows.map((bid) => ({
    itemNumber: bid.itemNumber,
    unit: bid.unit,
    officialQuantity: Number(bid.officialQuantity),
  }))

  const flagged = flagConditions(reviewable, bidQuantities)
  const confirmedAtById = new Map(rows.map((row) => [row.id, row.confirmedAt]))

  return {
    subQuote: {
      id: subQuote.id,
      subName: subQuote.subName,
      trade: subQuote.trade,
      totalAmount: fresh?.totalAmount ?? subQuote.totalAmount,
      totalAmountConfirmed: fresh?.totalAmountConfirmed ?? subQuote.totalAmountConfirmed,
      status: fresh?.status ?? subQuote.status,
      documentId: subQuote.documentId,
      fileName: document?.fileName ?? "Quote",
      mimeType: document?.mimeType ?? null,
    },
    conditions: flagged.map((condition) => ({
      ...condition,
      categoryLabel: CONDITION_CATEGORY_LABELS[condition.category] ?? condition.category,
      confirmedAt: confirmedAtById.get(condition.id)?.toISOString() ?? null,
    })),
    progress: reviewProgress(flagged),
    notesMuted: extractorNotesWereMuted(reviewable),
    pendingReason: await resolvePendingReason(scopedDb, subQuote, rows.length),
  }
}

async function resolvePendingReason(
  scopedDb: Awaited<ReturnType<typeof getScopedDb>>,
  subQuote: typeof subQuotes.$inferSelect,
  conditionCount: number,
): Promise<SubQuoteReview["pendingReason"]> {
  if (conditionCount > 0) return null

  const jobs = await scopedDb.takeoffJobs.findMany(
    eq(takeoffJobs.documentId, subQuote.documentId),
  )
  const latest = jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]

  if (!latest) return "extracting"
  if (latest.status === "queued" || latest.status === "running") return "extracting"
  if (latest.status === "failed") return "failed"
  // Complete, but the extractor found nothing — a real outcome for a document
  // that turned out not to be a sub quote, and different from "still working".
  return "none_found"
}

/** Accepts the AI's reading of one condition as-is. Correcting it first goes through updateConditionAction. */
export async function confirmConditionAction(rawId: string): Promise<void> {
  const id = parseInput(uuidSchema, rawId)
  const scopedDb = await getScopedDb()

  const [updated] = await scopedDb.quoteConditions.update(eq(quoteConditions.id, id), {
    isConfirmed: true,
    confirmedBy: scopedDb.userId,
    confirmedAt: new Date(),
    updatedAt: new Date(),
  })
  if (!updated) throw new Error("Condition not found.")

  await refreshSubQuoteStatus(scopedDb, updated.subQuoteId)
}

/** Undo, for a row confirmed by mistake. Clears the attribution too — a stale one is worse than none. */
export async function unconfirmConditionAction(rawId: string): Promise<void> {
  const id = parseInput(uuidSchema, rawId)
  const scopedDb = await getScopedDb()

  const [updated] = await scopedDb.quoteConditions.update(eq(quoteConditions.id, id), {
    isConfirmed: false,
    confirmedBy: null,
    confirmedAt: null,
    updatedAt: new Date(),
  })
  if (!updated) throw new Error("Condition not found.")

  await refreshSubQuoteStatus(scopedDb, updated.subQuoteId)
}

const updateConditionSchema = z.object({
  id: uuidSchema,
  category: z.enum(quoteConditionCategoryEnum.enumValues),
  normalizedValue: z.string().trim().max(500).nullable(),
})

/**
 * Corrects a condition and confirms it in one step. Editing is itself an act
 * of review — someone has read the source and taken ownership of the row — so
 * a separate Confirm click afterwards would be busywork whose only real effect
 * is leaving half-corrected rows sitting unconfirmed.
 *
 * rawText is deliberately not editable: it is verbatim from the document by
 * definition, and the split view's whole premise is that this exact string can
 * be found on the page. Correcting a misreading means fixing what it means
 * (normalizedValue) or what it is (category).
 */
export async function updateConditionAction(rawInput: {
  id: string
  category: string
  normalizedValue: string | null
}): Promise<void> {
  const input = parseInput(updateConditionSchema, rawInput)
  const scopedDb = await getScopedDb()

  const [updated] = await scopedDb.quoteConditions.update(eq(quoteConditions.id, input.id), {
    category: input.category,
    normalizedValue: input.normalizedValue || null,
    isConfirmed: true,
    confirmedBy: scopedDb.userId,
    confirmedAt: new Date(),
    updatedAt: new Date(),
  })
  if (!updated) throw new Error("Condition not found.")

  await refreshSubQuoteStatus(scopedDb, updated.subQuoteId)
}

/** Confirms the quote's bottom-line figure, tracked separately because it is the number that reaches a bid tab. */
export async function confirmQuoteTotalAction(rawSubQuoteId: string): Promise<void> {
  const subQuoteId = parseInput(uuidSchema, rawSubQuoteId)
  const scopedDb = await getScopedDb()

  const [updated] = await scopedDb.subQuotes.update(eq(subQuotes.id, subQuoteId), {
    totalAmountConfirmed: true,
    updatedAt: new Date(),
  })
  if (!updated) throw new Error("Sub quote not found.")
}

async function refreshSubQuoteStatus(
  scopedDb: Awaited<ReturnType<typeof getScopedDb>>,
  subQuoteId: string,
): Promise<void> {
  const rows = await scopedDb.quoteConditions.findMany(
    eq(quoteConditions.subQuoteId, subQuoteId),
  )
  if (rows.length === 0) return

  const allConfirmed = rows.every((row) => row.isConfirmed)
  await scopedDb.subQuotes.update(eq(subQuotes.id, subQuoteId), {
    status: allConfirmed ? "confirmed" : "needs_review",
    updatedAt: new Date(),
  })
}

/**
 * Signed URL for the original document, shown beside the conditions.
 *
 * Deliberately not getDocumentViewUrlAction: that signs for 60 seconds, which
 * is right for "click to open a file" and wrong here — this URL backs a pane
 * someone reads from while working through twenty conditions, and a link that
 * dies mid-review would blank the document with no obvious cause. The client
 * re-requests before this elapses.
 */
const REVIEW_DOCUMENT_URL_TTL_SECONDS = 15 * 60

export async function getSubQuoteDocumentUrl(rawSubQuoteId: string): Promise<string> {
  const subQuoteId = parseInput(uuidSchema, rawSubQuoteId)
  const scopedDb = await getScopedDb()

  const subQuote = await scopedDb.subQuotes.findFirst(eq(subQuotes.id, subQuoteId))
  if (!subQuote) {
    throw new Error("Sub quote not found.")
  }

  const document = await scopedDb.documents.findFirst(eq(documents.id, subQuote.documentId))
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

export type SubQuoteListItem = {
  id: string
  subName: string
  trade: string
  status: (typeof subQuoteStatusEnum.enumValues)[number]
  confirmed: number
  total: number
  flaggedRemaining: number
}

/** Feeds the quote picker. Quotes with outstanding flags sort first — the same principle as the condition ordering, one level up. */
export async function listSubQuotesForReview(rawProjectId: string): Promise<SubQuoteListItem[]> {
  const projectId = parseInput(uuidSchema, rawProjectId)
  const scopedDb = await getScopedDb()

  const quotes = await scopedDb.subQuotes.findMany(eq(subQuotes.projectId, projectId))
  if (quotes.length === 0) return []

  const conditions = await scopedDb.quoteConditions.findMany(
    inArray(
      quoteConditions.subQuoteId,
      quotes.map((quote) => quote.id),
    ),
  )

  return quotes
    .map((quote) => {
      const own = conditions.filter((row) => row.subQuoteId === quote.id)
      const flagged = flagConditions(
        own.map((row) => ({
          id: row.id,
          category: row.category,
          rawText: row.rawText,
          normalizedValue: row.normalizedValue,
          sourcePage: row.sourcePage,
          boundingBox: row.boundingBox ?? null,
          confidence: row.confidence == null ? null : Number(row.confidence),
          flagReason: row.flagReason,
          isConfirmed: row.isConfirmed,
        })),
      )
      const progress = reviewProgress(flagged)
      return {
        id: quote.id,
        subName: quote.subName,
        trade: quote.trade,
        status: quote.status,
        confirmed: progress.confirmed,
        total: progress.total,
        flaggedRemaining: progress.flaggedRemaining,
      }
    })
    .sort((a, b) => {
      if (a.flaggedRemaining !== b.flaggedRemaining) return b.flaggedRemaining - a.flaggedRemaining
      const aRemaining = a.total - a.confirmed
      const bRemaining = b.total - b.confirmed
      if (aRemaining !== bRemaining) return bRemaining - aRemaining
      return a.subName.localeCompare(b.subName)
    })
}

// ---------------------------------------------------------------------------
// Phase 4 — comparison grid.
// ---------------------------------------------------------------------------

export type TradeSummary = { trade: string; quoteCount: number }

/** Trades with at least one quote, most-quoted first — a trade with one quote has nothing to level against. */
export async function listTradesForComparison(rawProjectId: string): Promise<TradeSummary[]> {
  const projectId = parseInput(uuidSchema, rawProjectId)
  const scopedDb = await getScopedDb()

  const quotes = await scopedDb.subQuotes.findMany(eq(subQuotes.projectId, projectId))
  const counts = new Map<string, number>()
  for (const quote of quotes) {
    counts.set(quote.trade, (counts.get(quote.trade) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([trade, quoteCount]) => ({ trade, quoteCount }))
    .sort((a, b) => b.quoteCount - a.quoteCount || a.trade.localeCompare(b.trade))
}

export async function getTradeComparison(
  rawProjectId: string,
  rawTrade: string,
): Promise<ComparisonGrid> {
  const projectId = parseInput(uuidSchema, rawProjectId)
  const trade = parseInput(z.string().trim().min(1).max(120), rawTrade)
  const scopedDb = await getScopedDb()

  const allQuotes = await scopedDb.subQuotes.findMany(eq(subQuotes.projectId, projectId))
  const quotes = allQuotes.filter((quote) => quote.trade === trade)
  if (quotes.length === 0) {
    return { trade, columns: [], rows: [] }
  }

  // Pull each quote's extraction into quote_condition first, so a quote that
  // has been read but never opened on the review screen still appears in the
  // grid rather than showing as a column of silence.
  await Promise.all(quotes.map((quote) => syncConditionsFromExtraction(scopedDb, quote)))

  const conditions = await scopedDb.quoteConditions.findMany(
    inArray(
      quoteConditions.subQuoteId,
      quotes.map((quote) => quote.id),
    ),
  )

  return buildComparisonGrid(
    trade,
    quotes.map((quote) => ({
      subQuoteId: quote.id,
      subName: quote.subName,
      trade: quote.trade,
      totalAmount: quote.totalAmount,
    })),
    conditions.map((condition) => ({
      id: condition.id,
      subQuoteId: condition.subQuoteId,
      category: condition.category,
      rawText: condition.rawText,
      normalizedValue: condition.normalizedValue,
      isConfirmed: condition.isConfirmed,
      primeCostUsd: condition.primeCostUsd,
    })),
  )
}

const primeCostSchema = z.object({
  conditionId: uuidSchema,
  // Null clears it. Null and 0 mean different things here: null is "not yet
  // costed" and 0 is "costed, at nothing" — the grid shows an uncosted
  // exclusion as provisional rather than free.
  amountUsd: z.number().min(0).max(100_000_000).nullable(),
})

/** What it costs the prime to cover one sub's exclusion themselves. This is the input that makes the adjusted price real. */
export async function setPrimeCostAction(rawInput: {
  conditionId: string
  amountUsd: number | null
}): Promise<void> {
  const input = parseInput(primeCostSchema, rawInput)
  const scopedDb = await getScopedDb()

  const [updated] = await scopedDb.quoteConditions.update(
    eq(quoteConditions.id, input.conditionId),
    {
      primeCostUsd: input.amountUsd == null ? null : input.amountUsd.toFixed(2),
      updatedAt: new Date(),
    },
  )
  if (!updated) throw new Error("Condition not found.")
}
