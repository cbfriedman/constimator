"use server"

import { eq } from "drizzle-orm"
import { z } from "zod"

import { getEstimateData } from "@/app/estimate/actions"
import { bids, estimateLines, estimates, projects, reconciliationItems } from "@/db/schema"
import { captureEvent } from "@/lib/analytics"
import {
  getBidsForProject,
  getCurrentProject,
  getOrCreateCurrentEstimate,
} from "@/lib/current-project"
import { getScopedDb } from "@/lib/db/scoped"
import { diffBidAgainstEstimate } from "@/lib/reconciliation-diff"
import { numericString, parseInput, uuidSchema } from "@/lib/validation"

const bidLineInputSchema = z.object({
  itemNumber: z.string().trim().min(1, "Item number is required"),
  description: z.string().trim().min(1, "Description is required"),
  unit: z.string().trim().min(1, "Unit is required"),
  officialQuantity: numericString(),
  specSection: z.string().nullable(),
})

export type BidLineInput = z.infer<typeof bidLineInputSchema>

export async function addBidLineAction(rawProjectId: string, rawInput: BidLineInput) {
  const projectId = parseInput(uuidSchema, rawProjectId)
  const input = parseInput(bidLineInputSchema, rawInput)
  const scopedDb = await getScopedDb()

  // Found during the step 30 security review — same class of bug as
  // confirmDocumentUpload and getOrCreateCurrentEstimate: without this,
  // a bid row could be inserted referencing another org's project via the
  // foreign key. Still stamped with the caller's own org (bids.insert
  // always does that), so nothing readable leaked, but a real
  // cross-tenant reference an attacker could trigger directly.
  const project = await scopedDb.projects.findFirst(eq(projects.id, projectId))
  if (!project) {
    throw new Error("Project not found.")
  }

  const [bid] = await scopedDb.bids.insert({ projectId, ...input })
  return bid
}

export async function updateBidLineAction(rawId: string, rawInput: BidLineInput) {
  const id = parseInput(uuidSchema, rawId)
  const input = parseInput(bidLineInputSchema, rawInput)
  const scopedDb = await getScopedDb()
  const [bid] = await scopedDb.bids.update(eq(bids.id, id), input)
  return bid
}

export async function deleteBidLineAction(rawId: string) {
  const id = parseInput(uuidSchema, rawId)
  const scopedDb = await getScopedDb()
  await scopedDb.bids.delete(eq(bids.id, id))
}

// Recomputes reconciliation_item from scratch against the project's
// current bid + estimate lines every time it's read, rather than trusting
// a possibly-stale cached row — bid lines and estimate lines can both
// change independently (editing a bid line, adding/removing an estimate
// line), and there's no event wiring every one of those back to a
// reconciliation update. The diff itself is cheap (pure JS over a project's
// worth of rows, no AI calls), so recomputing on every load is simpler and
// more trustworthy than trying to keep a cache correctly invalidated.
//
// getBidsForProject/getEstimateData are both request-cached (see
// lib/current-project.ts) — getProjectStateSnapshot() (root layout) already
// calls both of these for the same project on every /reconciliation or
// /reports load, so this reuses that result instead of re-querying.
async function recomputeReconciliation(
  scopedDb: Awaited<ReturnType<typeof getScopedDb>>,
  projectId: string,
) {
  const [bidRows, { rows: estimateLineRows }] = await Promise.all([
    getBidsForProject(scopedDb, projectId),
    getEstimateData(),
  ])

  await scopedDb.reconciliationItems.delete(
    eq(reconciliationItems.projectId, projectId),
  )

  if (bidRows.length === 0) {
    return { bidRows, itemRows: [], estimateLineRows }
  }

  const diffs = diffBidAgainstEstimate(bidRows, estimateLineRows)
  const itemRows = await Promise.all(
    diffs.map((diff) => scopedDb.reconciliationItems.insert({ projectId, ...diff })),
  )

  // Fires on every /reconciliation or /reports visit that has real bid
  // data to diff against, not just the first time — unlike project_created/
  // document_uploaded (genuinely one-time events), "was a reconciliation
  // actually computed with real data" is closer to a view/usage-frequency
  // signal, and that's the useful thing to know here: how often orgs
  // actually get value from the core differentiator, not just whether
  // they tried it once.
  await captureEvent("reconciliation_computed", {
    userId: scopedDb.userId,
    orgId: scopedDb.orgId,
    properties: {
      projectId,
      bidLineCount: bidRows.length,
      attentionCount: diffs.filter((diff) => diff.attention).length,
    },
  })

  return { bidRows, itemRows: itemRows.flat(), estimateLineRows }
}

export async function getReconciliationData() {
  const scopedDb = await getScopedDb()
  const project = await getCurrentProject(scopedDb)
  if (!project) {
    return { bidRows: [], itemRows: [], estimateLineRows: [], project: null }
  }

  const { bidRows, itemRows, estimateLineRows } = await recomputeReconciliation(
    scopedDb,
    project.id,
  )

  return { bidRows, itemRows, estimateLineRows, project }
}

export async function addMissingItemToEstimateAction(rawBidId: string) {
  const bidId = parseInput(uuidSchema, rawBidId)
  const scopedDb = await getScopedDb()
  const bid = await scopedDb.bids.findFirst(eq(bids.id, bidId))
  const project = await getCurrentProject(scopedDb)
  if (!bid || !project) return
  // scopedDb.bids.findFirst already confines this to the caller's own org
  // — this additionally confines it to the project it's actually being
  // reconciled against, so a bid id from an older project in the same org
  // can't get spliced into the current project's estimate. Found during
  // a pre-launch audit, same bug class already fixed elsewhere in this
  // file (addBidLineAction) and in app/upload/actions.ts.
  if (bid.projectId !== project.id) return

  const estimate = await getOrCreateCurrentEstimate(scopedDb, project.id)
  const existingLines = await scopedDb.estimateLines.findMany(
    eq(estimateLines.estimateId, estimate.id),
  )

  // No unit-price entry UI exists yet for a genuinely missing item — this
  // adds it at $0 so it shows up and reconciles, rather than guessing a
  // price. Whoever's estimating still needs to price it.
  await scopedDb.estimateLines.insert({
    estimateId: estimate.id,
    bidId: bid.id,
    lineNumber: existingLines.length + 1,
    description: bid.description,
    quantity: bid.officialQuantity,
    unit: bid.unit,
    unitPrice: "0",
    markupPct: "10",
    total: "0",
    source: "manual",
  })

  // Next getReconciliationData() call will recompute and see this line
  // via its bidId — no need to hand-patch the reconciliation_item row.
}

// "Accept Official Quantity" in the detail sheet — adopts the bid form's
// quantity/unit into the linked estimate line and marks its source
// "official" (the same SourceBadge value used everywhere else in the app
// for "straight from the agency's official bid schedule").
export async function acceptOfficialQuantityAction(
  rawEstimateLineId: string,
  rawBidId: string,
) {
  const estimateLineId = parseInput(uuidSchema, rawEstimateLineId)
  const bidId = parseInput(uuidSchema, rawBidId)
  const scopedDb = await getScopedDb()
  const [bid, line] = await Promise.all([
    scopedDb.bids.findFirst(eq(bids.id, bidId)),
    scopedDb.estimateLines.findFirst(eq(estimateLines.id, estimateLineId)),
  ])
  if (!bid || !line) return

  // Same cross-project splice check as addMissingItemToEstimateAction
  // above — confirms the bid and the estimate line actually belong to the
  // same project (via the line's estimate) before letting one's quantity
  // overwrite the other's, not just that both belong to the caller's org.
  const estimate = await scopedDb.estimates.findFirst(eq(estimates.id, line.estimateId))
  if (!estimate || estimate.projectId !== bid.projectId) return

  await scopedDb.estimateLines.update(eq(estimateLines.id, estimateLineId), {
    quantity: bid.officialQuantity,
    unit: bid.unit,
    source: "official",
  })
}
