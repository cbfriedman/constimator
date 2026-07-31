"use server"

import { eq } from "drizzle-orm"

import { getEstimateData } from "@/app/estimate/actions"
import { bids, estimateLines, reconciliationItems } from "@/db/schema"
import { getCurrentProject, getOrCreateCurrentEstimate } from "@/lib/current-project"
import { getScopedDb } from "@/lib/db/scoped"
import { reconciliationRows as defaultReconciliationRows } from "@/lib/reconciliation-data"
import { UI_TO_DB_FILTER } from "@/lib/reconciliation-view"

function stripSign(value: string): string {
  return value.replace(/[−,]/g, (match) => (match === "−" ? "-" : ""))
}

function toNullableNumericString(value: string): string | null {
  if (value === "—") return null
  return stripSign(value)
}

async function seedDefaultsIfEmpty(
  scopedDb: Awaited<ReturnType<typeof getScopedDb>>,
  projectId: string,
  estimateLineRows: Awaited<ReturnType<typeof getEstimateData>>["rows"],
) {
  const existingBids = await scopedDb.bids.findMany(eq(bids.projectId, projectId))
  if (existingBids.length > 0) {
    const existingItems = await scopedDb.reconciliationItems.findMany(
      eq(reconciliationItems.projectId, projectId),
    )
    return { bidRows: existingBids, itemRows: existingItems }
  }

  await Promise.all(
    defaultReconciliationRows.map(async (row) => {
      const [bid] = await scopedDb.bids.insert({
        projectId,
        itemNumber: String(row.id),
        description: row.description,
        unit: row.unit,
        officialQuantity: stripSign(row.officialQty),
        specSection: row.spec === "—" ? null : row.spec,
      })

      // Real data can't have one page's estimate agree with a line and this
      // page's bid disagree on whether it exists — so this matches against
      // the estimate lines actually seeded (app/estimate/actions.ts), rather
      // than replaying the mock's "item 15 is missing" narrative, which only
      // ever held in the mock because the two pages' data was never actually
      // cross-checked. addMissingItemToEstimateAction below still handles a
      // genuinely missing item correctly — this just doesn't manufacture one.
      const matchingLine = estimateLineRows.find(
        (line) => line.description === row.description,
      )

      await scopedDb.reconciliationItems.insert({
        projectId,
        bidId: bid.id,
        estimateLineId: matchingLine?.id ?? null,
        aiQuantity: toNullableNumericString(row.aiQty),
        diffQuantity: matchingLine ? "0" : toNullableNumericString(row.diff),
        diffPct: matchingLine ? "0" : toNullableNumericString(row.pctDiff),
        confidence: String(row.confidence),
        planSheets: row.planSheets === "—" ? null : row.planSheets,
        statusLabel: matchingLine ? "Match" : row.statusLabel,
        statusColor: matchingLine ? "green" : row.statusColor,
        attention: matchingLine ? false : row.attention,
        filters: matchingLine
          ? ["matched"]
          : row.filters
              .map((f) => UI_TO_DB_FILTER[f])
              .filter((f): f is NonNullable<typeof f> => f !== null),
        explanation: row.explanation ?? null,
      })
    }),
  )

  const bidRows = await scopedDb.bids.findMany(eq(bids.projectId, projectId))
  const itemRows = await scopedDb.reconciliationItems.findMany(
    eq(reconciliationItems.projectId, projectId),
  )
  return { bidRows, itemRows }
}

export async function getReconciliationData() {
  const scopedDb = await getScopedDb()
  const project = await getCurrentProject(scopedDb)
  if (!project) return { bidRows: [], itemRows: [], estimateLineRows: [], project: null }

  const { rows: estimateLineRows } = await getEstimateData()
  const { bidRows, itemRows } = await seedDefaultsIfEmpty(
    scopedDb,
    project.id,
    estimateLineRows,
  )

  return { bidRows, itemRows, estimateLineRows, project }
}

export async function addMissingItemToEstimateAction(reconciliationItemId: string) {
  const scopedDb = await getScopedDb()
  const item = await scopedDb.reconciliationItems.findFirst(
    eq(reconciliationItems.id, reconciliationItemId),
  )
  if (!item) return

  const bid = await scopedDb.bids.findFirst(eq(bids.id, item.bidId))
  const project = await getCurrentProject(scopedDb)
  if (!bid || !project) return

  const estimate = await getOrCreateCurrentEstimate(scopedDb, project.id)
  const existingLines = await scopedDb.estimateLines.findMany(
    eq(estimateLines.estimateId, estimate.id),
  )

  // No unit-price entry UI exists yet for a genuinely missing item — this
  // adds it at $0 so it shows up and reconciles, rather than guessing a
  // price. Whoever's estimating still needs to price it.
  const [newLine] = await scopedDb.estimateLines.insert({
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

  await scopedDb.reconciliationItems.update(eq(reconciliationItems.id, reconciliationItemId), {
    estimateLineId: newLine.id,
    diffQuantity: "0",
    diffPct: "0",
    statusLabel: "Match — added to estimate",
    statusColor: "green",
    attention: false,
    filters: ["matched"],
  })
}
