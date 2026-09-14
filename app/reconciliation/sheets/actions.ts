"use server"

import { and, eq, inArray } from "drizzle-orm"
import { z } from "zod"

import { getEstimateData } from "@/app/estimate/actions"
import { bids, documents, estimateLines, planCallouts, takeoffJobs } from "@/db/schema"
import { captureEvent } from "@/lib/analytics"
import type { ExtractedPlanCallout, ExtractedTakeoffItem } from "@/lib/cost-engine/types"
import {
  getBidsForProject,
  getCurrentProject,
  getOrCreateCurrentEstimate,
} from "@/lib/current-project"
import { getScopedDb } from "@/lib/db/scoped"
import { matchBidItem } from "@/lib/plan-callout-match"
import { buildSheetMatrix, type SheetMatrix } from "@/lib/sheet-matrix"
import { numericString, parseInput, uuidSchema } from "@/lib/validation"

type ScopedDb = Awaited<ReturnType<typeof getScopedDb>>
type TakeoffJobRow = typeof takeoffJobs.$inferSelect
type BidRow = typeof bids.$inferSelect

// What the worker wrote into takeoff_job.result.callouts, checked before it
// becomes rows. Same reason lib/bid-form-import.ts validates bidItems: the
// jsonb is whatever Claude returned, and a malformed entry should drop that
// entry, not take the page down.
const extractedPlanCalloutSchema = z.object({
  sheetNumber: z.string().trim().min(1),
  sheetTitle: z.string().trim().min(1).optional(),
  pageNumber: z.number().int().positive(),
  description: z.string().trim().min(1),
  quantity: z.number().finite(),
  unit: z.string().trim().min(1),
  sourceText: z.string().trim().min(1),
  sourceKind: z.string().trim().min(1),
  bidItemNumber: z.string().trim().min(1).optional(),
  confidence: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
})

export type SheetMatrixData = {
  project: { id: string; name: string; number: string } | null
  matrix: SheetMatrix | null
  hasBidForm: boolean
  /** A plan set has been uploaded — whether or not it has finished processing. */
  hasPlanSet: boolean
  /** Plan sets still queued or running — the matrix will grow when they finish. */
  processingCount: number
  /** Plan sets processed before the callout extractor existed: nothing to show for them. */
  legacyPlanSetCount: number
}

function timestampMs(value: Date | string | number | null | undefined): number {
  if (value == null) return Number.NaN
  if (typeof value === "number") return value
  const date = value instanceof Date ? value : new Date(value)
  return date.getTime()
}

// Same "latest complete job per document wins" rule as
// app/intelligence/actions.ts — a document can have several job rows after
// a retry, and only the newest finished one is what the document says now.
function latestCompletePlanJobs(jobs: TakeoffJobRow[]): TakeoffJobRow[] {
  const latest = new Map<string, TakeoffJobRow>()
  for (const job of jobs) {
    const current = latest.get(job.documentId)
    if (!current || timestampMs(job.createdAt) > timestampMs(current.createdAt)) {
      latest.set(job.documentId, job)
    }
  }
  return [...latest.values()].filter(
    (job) =>
      job.status === "complete" &&
      job.result &&
      (job.result.kind === "plan_takeoff" || job.result.kind === undefined),
  )
}

function initialMatch(callout: ExtractedPlanCallout, bidRows: BidRow[]) {
  const match = matchBidItem(
    { description: callout.description, unit: callout.unit, bidItemNumber: callout.bidItemNumber },
    bidRows,
  )
  return { bidId: match?.bid.id ?? null, matchSource: match?.source ?? null }
}

/**
 * Writes a document's extracted callouts into plan_callout the first time
 * the matrix is read after its job finished. Once rows exist for a
 * document they are never re-synced from the jsonb — bid_id and dismissed
 * carry human decisions the AI's original reading must not undo. Same
 * terms as plan holder contacts (app/plan-holders/actions.ts).
 */
async function materializeCallouts(
  scopedDb: ScopedDb,
  projectId: string,
  jobs: TakeoffJobRow[],
  bidRows: BidRow[],
  documentIdsWithRows: Set<string>,
): Promise<void> {
  for (const job of jobs) {
    if (documentIdsWithRows.has(job.documentId)) continue
    const parsed = z.array(extractedPlanCalloutSchema).safeParse(job.result?.callouts ?? [])
    const extracted = parsed.success
      ? parsed.data
      : // A bad entry drops that entry, not the document's whole reading.
        (job.result?.callouts ?? []).flatMap((callout) => {
          const one = extractedPlanCalloutSchema.safeParse(callout)
          return one.success ? [one.data] : []
        })
    if (extracted.length === 0) continue

    await scopedDb.planCallouts.insertMany(
      extracted.map((callout) => ({
        projectId,
        documentId: job.documentId,
        ...initialMatch(callout, bidRows),
        sheetNumber: callout.sheetNumber,
        sheetTitle: callout.sheetTitle ?? null,
        pageNumber: callout.pageNumber,
        description: callout.description,
        quantity: callout.quantity.toFixed(2),
        unit: callout.unit,
        sourceText: callout.sourceText,
        sourceKind: callout.sourceKind,
        aiBidItemNumber: callout.bidItemNumber ?? null,
        confidence: callout.confidence == null ? null : callout.confidence.toFixed(2),
        notes: callout.notes ?? null,
      })),
    )
    documentIdsWithRows.add(job.documentId)
  }
}

/**
 * Links callouts the bid form can now claim. Runs on every read because the
 * bid form arrives on its own schedule — imported after the plans, edited
 * by hand, replaced wholesale (which nulls every bid_id via the FK) — and
 * there's no event wiring any of that back here. Cheap: text matching over
 * one project's rows. Never touches a row a human linked or unlinked.
 */
async function rematchUnlinked(
  scopedDb: ScopedDb,
  calloutRows: (typeof planCallouts.$inferSelect)[],
  bidRows: BidRow[],
): Promise<(typeof planCallouts.$inferSelect)[]> {
  if (bidRows.length === 0) return calloutRows
  const updated = [...calloutRows]
  for (let i = 0; i < updated.length; i += 1) {
    const callout = updated[i]
    if (callout.bidId || callout.matchSource === "manual") continue
    const match = matchBidItem(
      { description: callout.description, unit: callout.unit, bidItemNumber: callout.aiBidItemNumber },
      bidRows,
    )
    if (!match) continue
    const [row] = await scopedDb.planCallouts.update(eq(planCallouts.id, callout.id), {
      bidId: match.bid.id,
      matchSource: match.source,
      updatedAt: new Date(),
    })
    if (row) updated[i] = row
  }
  return updated
}

export async function getSheetMatrixData(): Promise<SheetMatrixData> {
  const scopedDb = await getScopedDb()
  const project = await getCurrentProject(scopedDb)
  if (!project) {
    return {
      project: null,
      matrix: null,
      hasBidForm: false,
      hasPlanSet: false,
      processingCount: 0,
      legacyPlanSetCount: 0,
    }
  }

  const [bidRows, docRows, { rows: estimateLineRows }] = await Promise.all([
    getBidsForProject(scopedDb, project.id),
    scopedDb.documents.findMany(eq(documents.projectId, project.id)),
    getEstimateData(),
  ])

  // Every document type the worker routes to the plan-sheet takeoff (see
  // worker/src/process-job.ts's final branch): plans, addenda, and "other".
  const planDocs = docRows.filter(
    (doc) => doc.type === "plans" || doc.type === "addendum" || doc.type === "other",
  )
  const jobRows =
    planDocs.length > 0
      ? await scopedDb.takeoffJobs.findMany(
          inArray(
            takeoffJobs.documentId,
            planDocs.map((doc) => doc.id),
          ),
        )
      : []
  const completeJobs = latestCompletePlanJobs(jobRows)

  let calloutRows = await scopedDb.planCallouts.findMany(eq(planCallouts.projectId, project.id))
  const documentIdsWithRows = new Set(calloutRows.map((row) => row.documentId))
  const before = documentIdsWithRows.size
  await materializeCallouts(scopedDb, project.id, completeJobs, bidRows, documentIdsWithRows)
  if (documentIdsWithRows.size !== before) {
    calloutRows = await scopedDb.planCallouts.findMany(eq(planCallouts.projectId, project.id))
  }
  calloutRows = await rematchUnlinked(scopedDb, calloutRows, bidRows)

  const takeoffItems: ExtractedTakeoffItem[] = completeJobs.flatMap(
    (job) => job.result?.items ?? [],
  )

  const matrix = buildSheetMatrix({
    bidRows,
    calloutRows,
    takeoffItems,
    estimateLineRows,
    documents: docRows.map((doc) => ({ id: doc.id, fileName: doc.fileName })),
  })

  return {
    project: { id: project.id, name: project.name, number: project.number },
    matrix,
    hasBidForm: bidRows.length > 0,
    hasPlanSet: planDocs.length > 0,
    processingCount: planDocs.filter(
      (doc) => doc.status === "uploaded" || doc.status === "processing",
    ).length,
    legacyPlanSetCount: completeJobs.filter((job) => job.result?.callouts === undefined).length,
  }
}

// total = quantity × unit price, same rule as app/estimate/actions.ts's
// computeTotal (private there; the two must agree or the estimate's own
// total drifts from what this column writes).
function computeTotal(quantity: string, unitPrice: string): string {
  const qty = Number(quantity)
  const price = Number(unitPrice)
  const total = Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0
  return total.toFixed(2)
}

const estimatorQuantitySchema = z.object({
  bidId: uuidSchema,
  quantity: numericString(),
})

/**
 * The matrix's "Estimator Qty" column. It is the estimate line's quantity —
 * not a third number kept beside it — so what the contractor types here is
 * what /estimate prices and what the bid-form reconciliation diffs. A bid
 * item with no line yet gets one at $0, exactly as "Add to Estimate" does.
 */
export async function setEstimatorQuantityAction(rawInput: { bidId: string; quantity: string }) {
  const input = parseInput(estimatorQuantitySchema, rawInput)
  const scopedDb = await getScopedDb()
  const project = await getCurrentProject(scopedDb)
  const bid = await scopedDb.bids.findFirst(eq(bids.id, input.bidId))
  // Same cross-project splice check as app/reconciliation/actions.ts's
  // addMissingItemToEstimateAction: a bid id from another project in the
  // caller's own org must not write into this project's estimate.
  if (!project || !bid || bid.projectId !== project.id) {
    throw new Error("Bid item not found.")
  }

  const estimate = await getOrCreateCurrentEstimate(scopedDb, project.id)
  const lines = await scopedDb.estimateLines.findMany(eq(estimateLines.estimateId, estimate.id))
  const quantity = Number(input.quantity).toFixed(2)

  const byBidId = lines.find((line) => line.bidId === bid.id)
  const wanted = bid.description.trim().toLowerCase()
  const byDescription = lines.filter((line) => line.description.trim().toLowerCase() === wanted)
  const existing = byBidId ?? (byDescription.length === 1 ? byDescription[0] : undefined)

  if (existing) {
    const [line] = await scopedDb.estimateLines.update(eq(estimateLines.id, existing.id), {
      quantity,
      // Linking the line to its bid item here means the next reconciliation
      // (and this matrix) find it by FK rather than by description.
      bidId: bid.id,
      total: computeTotal(quantity, existing.unitPrice),
      updatedAt: new Date(),
    })
    return { estimateLineId: line.id, quantity: line.quantity }
  }

  const [line] = await scopedDb.estimateLines.insert({
    estimateId: estimate.id,
    bidId: bid.id,
    lineNumber: lines.length + 1,
    description: bid.description,
    quantity,
    unit: bid.unit,
    unitPrice: "0",
    markupPct: "10",
    total: "0",
    source: "manual",
  })
  return { estimateLineId: line.id, quantity: line.quantity }
}

const linkCalloutSchema = z.object({
  calloutId: uuidSchema,
  bidId: uuidSchema.nullable(),
})

/**
 * A human's answer to "which bid item is this for" — including "none".
 * Marked manual so the automatic re-match on read leaves it alone.
 */
export async function linkCalloutAction(rawInput: { calloutId: string; bidId: string | null }) {
  const input = parseInput(linkCalloutSchema, rawInput)
  const scopedDb = await getScopedDb()
  const project = await getCurrentProject(scopedDb)
  const callout = await scopedDb.planCallouts.findFirst(eq(planCallouts.id, input.calloutId))
  if (!project || !callout || callout.projectId !== project.id) {
    throw new Error("Callout not found.")
  }
  if (input.bidId) {
    const bid = await scopedDb.bids.findFirst(
      and(eq(bids.id, input.bidId), eq(bids.projectId, project.id)),
    )
    if (!bid) throw new Error("Bid item not found.")
  }
  await scopedDb.planCallouts.update(eq(planCallouts.id, callout.id), {
    bidId: input.bidId,
    matchSource: "manual",
    updatedAt: new Date(),
  })
}

const dismissCalloutSchema = z.object({
  calloutId: uuidSchema,
  dismissed: z.boolean(),
})

export async function dismissCalloutAction(rawInput: { calloutId: string; dismissed: boolean }) {
  const input = parseInput(dismissCalloutSchema, rawInput)
  const scopedDb = await getScopedDb()
  const project = await getCurrentProject(scopedDb)
  const callout = await scopedDb.planCallouts.findFirst(eq(planCallouts.id, input.calloutId))
  if (!project || !callout || callout.projectId !== project.id) {
    throw new Error("Callout not found.")
  }
  await scopedDb.planCallouts.update(eq(planCallouts.id, callout.id), {
    dismissed: input.dismissed,
    updatedAt: new Date(),
  })
}

export async function recordRfiDraftedAction(rawCalloutId: string) {
  const calloutId = parseInput(uuidSchema, rawCalloutId)
  const scopedDb = await getScopedDb()
  const callout = await scopedDb.planCallouts.findFirst(eq(planCallouts.id, calloutId))
  if (!callout) return
  await captureEvent("sheet_rfi_drafted", {
    userId: scopedDb.userId,
    orgId: scopedDb.orgId,
    properties: {
      projectId: callout.projectId,
      linked: callout.bidId != null,
      sourceKind: callout.sourceKind,
    },
  })
}
