import "server-only"

import { eq } from "drizzle-orm"

import { estimateLines, projects } from "@/db/schema"
import type { ScopedDb } from "@/lib/current-project"
import { getBidsForProject, getOrCreateCurrentEstimate } from "@/lib/current-project"
import { diffBidAgainstEstimate } from "@/lib/reconciliation-diff"

type ProjectRow = typeof projects.$inferSelect

/**
 * The numbers behind the dashboard's project overview (Sep 2026 visual
 * design: four stat tiles, a reconciliation donut, a status breakdown).
 *
 * Every figure is derived from the same diff the /reconciliation page shows
 * — lib/reconciliation-diff.ts's diffBidAgainstEstimate over the project's
 * real bid rows and real estimate lines — so the dashboard can never
 * disagree with the page it summarises. Nothing here is sampled, seeded or
 * estimated.
 *
 * The three buckets partition the bid form:
 *   matched     — "matched" filter, which includes lump-sum items (their
 *                 quantity is 1 on both sides by definition; scope is what
 *                 needs checking, and the page says so)
 *   missing     — no estimate line matched the bid item at all
 *   mismatched  — a line matched but the quantity or the unit disagrees
 *
 * The mockup also had an "Items by Category" panel (Roadway / Drainage /
 * Structures / ...). There is no category on a bid row in this schema —
 * agencies don't print one and the extractor doesn't invent one — so that
 * panel is not built. The status breakdown below is what the data can
 * actually say.
 */
export type ReconciliationSummary = {
  project: Pick<ProjectRow, "id" | "name" | "number" | "status">
  /** False when no official bid form has been imported; every count is 0. */
  hasBidForm: boolean
  totalItems: number
  matched: number
  missing: number
  mismatched: number
  /** Subsets of the buckets above, for the breakdown rows. */
  quantityDiscrepancies: number
  unitMismatches: number
  lumpSum: number
  /** Rows the reconciliation flags for a human — the sidebar badge number. */
  attention: number
}

export async function getReconciliationSummary(
  scopedDb: ScopedDb,
  project: Pick<ProjectRow, "id" | "name" | "number" | "status">,
): Promise<ReconciliationSummary> {
  const empty: ReconciliationSummary = {
    project,
    hasBidForm: false,
    totalItems: 0,
    matched: 0,
    missing: 0,
    mismatched: 0,
    quantityDiscrepancies: 0,
    unitMismatches: 0,
    lumpSum: 0,
    attention: 0,
  }

  const bidRows = await getBidsForProject(scopedDb, project.id)
  if (bidRows.length === 0) return empty

  const estimate = await getOrCreateCurrentEstimate(scopedDb, project.id)
  const lineRows = await scopedDb.estimateLines.findMany(
    eq(estimateLines.estimateId, estimate.id),
  )
  const diffs = diffBidAgainstEstimate(bidRows, lineRows)

  const has = (diff: (typeof diffs)[number], key: (typeof diffs)[number]["filters"][number]) =>
    diff.filters.includes(key)

  const quantityDiscrepancies = diffs.filter((d) => has(d, "quantity_discrepancy")).length
  const unitMismatches = diffs.filter((d) => has(d, "unit_converted")).length

  return {
    project,
    hasBidForm: true,
    totalItems: diffs.length,
    matched: diffs.filter((d) => has(d, "matched")).length,
    missing: diffs.filter((d) => has(d, "missing")).length,
    mismatched: quantityDiscrepancies + unitMismatches,
    quantityDiscrepancies,
    unitMismatches,
    lumpSum: diffs.filter((d) => has(d, "lump_sum")).length,
    attention: diffs.filter((d) => d.attention).length,
  }
}
