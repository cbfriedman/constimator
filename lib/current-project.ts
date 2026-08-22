import "server-only"

import { cache } from "react"
import { eq } from "drizzle-orm"

import { bids, projects, estimates } from "@/db/schema"
import type { getScopedDb } from "@/lib/db/scoped"
import { todayIsoDate } from "@/lib/format-date"
import { syncRateDrift } from "@/lib/cost-engine/drift"

export type ScopedDb = Awaited<ReturnType<typeof getScopedDb>>
type ProjectRow = typeof projects.$inferSelect
type BidRow = typeof bids.$inferSelect

// The single rule for "which project" cost-setup/estimate/reconciliation/
// reports/schedules operate on, since none of them take a ?project= id (or
// equivalent) the way /upload does. Exported so callers that already have
// the row list in hand (e.g. the dashboard, deciding which table row is
// safe to click into) can apply the exact same rule without a second query.
function createdAtMs(value: Date | string): number {
  const ms = (value instanceof Date ? value : new Date(value)).getTime()
  return Number.isNaN(ms) ? 0 : ms
}

export function pickCurrentProject(rows: ProjectRow[]): ProjectRow | null {
  if (rows.length === 0) return null
  return [...rows].sort((a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt))[0]
}

// Stand-in for real per-project routing — see pickCurrentProject above.
// Revisit once these pages are project-scoped.
//
// Cached per request (React's cache(), scoped to one render — not a
// long-lived cache and never needs manual invalidation). An audit found
// this running 4x on a single /reports load: the root layout's
// getProjectStateSnapshot(), the page's own getEstimateData(), and
// getReconciliationData() each called it independently. Same for
// getOrCreateCurrentEstimate below and getBidsForProject further down —
// all three were the actual redundant work; the diff math itself
// (lib/reconciliation-diff.ts) is cheap by comparison.
export const getCurrentProject = cache(async (scopedDb: ScopedDb) => {
  const projectRows = await scopedDb.projects.findMany()
  return pickCurrentProject(projectRows)
})

// The official bid-form lines for a project — fetched separately by both
// getProjectStateSnapshot() (for the attention count) and
// getReconciliationData()'s recomputeReconciliation() (for the full diff +
// reconciliation_item rewrite). Cached per request so that's one query, not
// two, for the same project on the same render.
export const getBidsForProject = cache(
  async (scopedDb: ScopedDb, projectId: string): Promise<BidRow[]> =>
    scopedDb.bids.findMany(eq(bids.projectId, projectId)),
)

export const getOrCreateCurrentEstimate = cache(async (
  scopedDb: ScopedDb,
  projectId: string,
) => {
  // Found during the step 30 security review: every caller of this
  // function that took projectId from something other than
  // getCurrentProject() (i.e. straight from a client-supplied Server
  // Action argument — addEstimateLineAction, generateEstimateFromTakeoff)
  // used it directly with no check that it's actually the caller's own
  // project. scopedDb.estimates.findFirst/insert are org-scoped, so no
  // other org's *data* was ever readable this way — but with no project
  // row to match, the code fell through to *creating* a new estimate
  // stamped with the caller's org yet pointing (via the projectId foreign
  // key) at another org's project. That's a real cross-tenant reference a
  // signed-in user could trigger by calling the Server Action directly
  // with someone else's project id, not just a theoretical gap: every
  // exported function in a "use server" file is a callable endpoint on
  // its own, regardless of which page the UI happens to call it from.
  const project = await scopedDb.projects.findFirst(eq(projects.id, projectId))
  if (!project) {
    throw new Error("Project not found.")
  }

  const existing = await scopedDb.estimates.findFirst(
    eq(estimates.projectId, projectId),
  )
  if (existing) return syncRateDrift(scopedDb, existing)

  const [created] = await scopedDb.estimates.insert({
    projectId,
    rateSnapshotDate: todayIsoDate(),
  })
  // A freshly created estimate is snapshotted as of right now, so there's
  // nothing to check drift against yet.
  return created
})
