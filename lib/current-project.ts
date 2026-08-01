import "server-only"

import { eq } from "drizzle-orm"

import { estimates } from "@/db/schema"
import type { getScopedDb } from "@/lib/db/scoped"
import { todayIsoDate } from "@/lib/format-date"
import { syncRateDrift } from "@/lib/cost-engine/drift"

export type ScopedDb = Awaited<ReturnType<typeof getScopedDb>>

// Stand-in for real per-project routing, same convention established in
// lib/project-state-actions.ts: there's no ?project= id (or equivalent) for
// cost-setup/estimate/reconciliation/reports/schedules the way /upload has
// one, so these pages track the org's most-recently-created project.
// Revisit once they're project-scoped.
export async function getCurrentProject(scopedDb: ScopedDb) {
  const projectRows = await scopedDb.projects.findMany()
  if (projectRows.length === 0) return null
  return [...projectRows].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )[0]
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
