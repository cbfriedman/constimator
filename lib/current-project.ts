import "server-only"

import { cache } from "react"
import { cookies, headers } from "next/headers"
import { eq } from "drizzle-orm"

import { bids, projects, estimates } from "@/db/schema"
import type { getScopedDb } from "@/lib/db/scoped"
import { todayIsoDate } from "@/lib/format-date"
import { syncRateDrift } from "@/lib/cost-engine/drift"
import {
  CURRENT_PROJECT_COOKIE,
  CURRENT_PROJECT_HEADER,
  PROJECT_COOKIE_OPTIONS,
  isProjectId,
  pickNewestProject,
  resolveCurrentProject,
} from "@/lib/project-scope"

export type ScopedDb = Awaited<ReturnType<typeof getScopedDb>>
type BidRow = typeof bids.$inferSelect

/** @deprecated Use pickNewestProject — kept so existing callers keep compiling. */
export const pickCurrentProject = pickNewestProject

async function requestedProjectId(): Promise<string | null> {
  const headerStore = await headers()
  const fromHeader = headerStore.get(CURRENT_PROJECT_HEADER)
  if (isProjectId(fromHeader)) return fromHeader

  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(CURRENT_PROJECT_COOKIE)?.value
  return isProjectId(fromCookie) ? fromCookie : null
}

export async function persistCurrentProjectId(projectId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(CURRENT_PROJECT_COOKIE, projectId, PROJECT_COOKIE_OPTIONS)
}

// The single rule for "which project" cost-setup/estimate/reconciliation/
// reports/schedules/intelligence operate on. Preference order:
//   1. `?project=` (copied onto x-constimator-project by middleware)
//   2. the durable selection cookie
//   3. newest-created project (first visit / cookie expired)
//
// Cached per request (React's cache(), scoped to one render — not a
// long-lived cache and never needs manual invalidation). An audit found
// this running 4x on a single /reports load: the root layout's
// getProjectStateSnapshot(), the page's own getEstimateData(), and
// getReconciliationData() each called it independently.
export const getCurrentProject = cache(async (scopedDb: ScopedDb) => {
  const projectRows = await scopedDb.projects.findMany()
  return resolveCurrentProject(projectRows, await requestedProjectId())
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
