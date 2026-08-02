import "server-only"

import { eq } from "drizzle-orm"

import type { projects } from "@/db/schema"
import { estimates } from "@/db/schema"
import type { getScopedDb } from "@/lib/db/scoped"
import { todayIsoDate } from "@/lib/format-date"
import { syncRateDrift } from "@/lib/cost-engine/drift"

export type ScopedDb = Awaited<ReturnType<typeof getScopedDb>>
type ProjectRow = typeof projects.$inferSelect

// The single rule for "which project" cost-setup/estimate/reconciliation/
// reports/schedules operate on, since none of them take a ?project= id (or
// equivalent) the way /upload does. Exported so callers that already have
// the row list in hand (e.g. the dashboard, deciding which table row is
// safe to click into) can apply the exact same rule without a second query.
export function pickCurrentProject(rows: ProjectRow[]): ProjectRow | null {
  if (rows.length === 0) return null
  return [...rows].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )[0]
}

// Stand-in for real per-project routing — see pickCurrentProject above.
// Revisit once these pages are project-scoped.
export async function getCurrentProject(scopedDb: ScopedDb) {
  const projectRows = await scopedDb.projects.findMany()
  return pickCurrentProject(projectRows)
}

export async function getOrCreateCurrentEstimate(
  scopedDb: ScopedDb,
  projectId: string,
) {
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
}
