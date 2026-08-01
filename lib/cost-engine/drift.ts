import "server-only"

import { eq } from "drizzle-orm"

import { estimates } from "@/db/schema"
import type { ScopedDb } from "@/lib/current-project"

type EstimateRow = typeof estimates.$inferSelect

/**
 * Real drift check: has any cost_item for this org been updated since the
 * estimate's rate_snapshot_date? Reuses the rateDrift/driftDismissed
 * columns and semantics already sketched in step 13's ProjectStateProvider
 * (see lib/project-state-actions.ts) — this is what actually computes the
 * flag instead of it only ever being set by the manual "Simulate rate
 * change (demo)" trigger or a /cost-setup edit in the same session.
 *
 * Only ever flips rateDrift false -> true here. Clearing it back to false
 * stays an explicit user action (recalculate/dismiss), not something a
 * background check should silently do.
 */
export async function syncRateDrift(
  scopedDb: ScopedDb,
  estimate: EstimateRow,
): Promise<EstimateRow> {
  if (estimate.rateDrift) return estimate

  const costItemRows = await scopedDb.costItems.findMany()
  if (costItemRows.length === 0) return estimate

  const latestRateChange = costItemRows.reduce(
    (latest, item) => (item.updatedAt > latest ? item.updatedAt : latest),
    new Date(0),
  )

  // rate_snapshot_date is a date, not a timestamp — treated as its
  // midnight UTC instant, so any cost_item edit on the same calendar date
  // as the snapshot counts as drift too. Conservative on purpose: getting
  // a stale-estimate warning one day early is a much smaller problem than
  // missing one.
  const snapshotInstant = new Date(`${estimate.rateSnapshotDate}T00:00:00.000Z`)
  if (latestRateChange <= snapshotInstant) return estimate

  const [updated] = await scopedDb.estimates.update(eq(estimates.id, estimate.id), {
    rateDrift: true,
    driftDismissed: false,
  })

  return updated ?? estimate
}
