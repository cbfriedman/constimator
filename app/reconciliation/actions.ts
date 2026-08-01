"use server"

import { eq } from "drizzle-orm"

import { getEstimateData } from "@/app/estimate/actions"
import { bids, estimateLines, reconciliationItems } from "@/db/schema"
import { getCurrentProject, getOrCreateCurrentEstimate } from "@/lib/current-project"
import { getScopedDb } from "@/lib/db/scoped"
import { diffBidAgainstEstimate } from "@/lib/reconciliation-diff"

export type BidLineInput = {
  itemNumber: string
  description: string
  unit: string
  officialQuantity: string
  specSection: string | null
}

export async function addBidLineAction(projectId: string, input: BidLineInput) {
  const scopedDb = await getScopedDb()
  const [bid] = await scopedDb.bids.insert({ projectId, ...input })
  return bid
}

export async function updateBidLineAction(id: string, input: BidLineInput) {
  const scopedDb = await getScopedDb()
  const [bid] = await scopedDb.bids.update(eq(bids.id, id), input)
  return bid
}

export async function deleteBidLineAction(id: string) {
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
async function recomputeReconciliation(
  scopedDb: Awaited<ReturnType<typeof getScopedDb>>,
  projectId: string,
) {
  const [bidRows, estimateLineRows] = await Promise.all([
    scopedDb.bids.findMany(eq(bids.projectId, projectId)),
    (async () => {
      const { rows } = await getEstimateData()
      return rows
    })(),
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

export async function addMissingItemToEstimateAction(bidId: string) {
  const scopedDb = await getScopedDb()
  const bid = await scopedDb.bids.findFirst(eq(bids.id, bidId))
  const project = await getCurrentProject(scopedDb)
  if (!bid || !project) return

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
  estimateLineId: string,
  bidId: string,
) {
  const scopedDb = await getScopedDb()
  const bid = await scopedDb.bids.findFirst(eq(bids.id, bidId))
  if (!bid) return

  await scopedDb.estimateLines.update(eq(estimateLines.id, estimateLineId), {
    quantity: bid.officialQuantity,
    unit: bid.unit,
    source: "official",
  })
}
