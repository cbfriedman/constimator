"use server"

import { eq } from "drizzle-orm"

import { estimates } from "@/db/schema"
import {
  getScopedDb,
  NoOrgMembershipError,
  UnauthenticatedError,
} from "@/lib/db/scoped"
import { formatDisplayDate, todayIsoDate } from "@/lib/format-date"

export type ProjectStateSnapshot = {
  costSetupComplete: boolean
  // null when the org has no projects yet — there's nothing to attach a
  // rate snapshot to. ProjectStateProvider falls back to defaults for these
  // fields in that case, same as it does for a signed-out/no-org visitor.
  estimate: {
    id: string
    rateSnapshotDate: string
    rateDrift: boolean
    driftDismissed: boolean
    recalculated: boolean
  } | null
}

type ScopedDb = Awaited<ReturnType<typeof getScopedDb>>

// There's no "start estimating" flow yet that creates an estimate row, and
// no per-project routing for this app-wide provider to know which project
// it's for (see step 12's upload page for the pattern that's still missing
// here) — so this picks the org's most recently created project as a stand-in
// and lazily creates its estimate row on first read. Revisit once estimate
// pages are project-scoped.
async function ensureEstimateForLatestProject(scopedDb: ScopedDb) {
  const projectRows = await scopedDb.projects.findMany()
  if (projectRows.length === 0) return null

  const latest = [...projectRows].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )[0]

  const existing = await scopedDb.estimates.findFirst(
    eq(estimates.projectId, latest.id),
  )
  if (existing) return existing

  const [created] = await scopedDb.estimates.insert({
    projectId: latest.id,
    rateSnapshotDate: todayIsoDate(),
  })
  return created
}

// Called from the root layout, so it runs for every route — including the
// signed-out marketing homepage and /sign-in, neither of which should ever
// depend on the database being reachable. UnauthenticatedError/
// NoOrgMembershipError are expected outcomes there; anything else (a real
// outage, a missing DATABASE_URL) is logged and still degrades to defaults
// rather than taking the whole site down.
export async function getProjectStateSnapshot(): Promise<ProjectStateSnapshot | null> {
  try {
    const scopedDb = await getScopedDb()
    const org = await scopedDb.org.get()
    if (!org) return null

    const estimate = await ensureEstimateForLatestProject(scopedDb)

    return {
      costSetupComplete: org.costSetupComplete,
      estimate: estimate
        ? {
            id: estimate.id,
            rateSnapshotDate: formatDisplayDate(estimate.rateSnapshotDate),
            rateDrift: estimate.rateDrift,
            driftDismissed: estimate.driftDismissed,
            recalculated: estimate.recalculated,
          }
        : null,
    }
  } catch (err) {
    if (!(err instanceof UnauthenticatedError || err instanceof NoOrgMembershipError)) {
      console.error("getProjectStateSnapshot failed, falling back to defaults:", err)
    }
    return null
  }
}

export async function setCostSetupCompleteAction(value: boolean) {
  const scopedDb = await getScopedDb()
  await scopedDb.org.update({ costSetupComplete: value })
}

export async function triggerRateDriftAction(estimateId: string) {
  const scopedDb = await getScopedDb()
  await scopedDb.estimates.update(eq(estimates.id, estimateId), {
    rateDrift: true,
    driftDismissed: false,
  })
}

export async function dismissDriftAction(estimateId: string) {
  const scopedDb = await getScopedDb()
  await scopedDb.estimates.update(eq(estimates.id, estimateId), {
    driftDismissed: true,
  })
}

export async function recalculateAction(estimateId: string) {
  const scopedDb = await getScopedDb()
  await scopedDb.estimates.update(eq(estimates.id, estimateId), {
    rateSnapshotDate: todayIsoDate(),
    rateDrift: false,
    driftDismissed: false,
    recalculated: true,
  })
}

export async function resetProjectStateAction(estimateId: string | null) {
  const scopedDb = await getScopedDb()
  await scopedDb.org.update({ costSetupComplete: false })
  if (estimateId) {
    await scopedDb.estimates.update(eq(estimates.id, estimateId), {
      rateSnapshotDate: todayIsoDate(),
      rateDrift: false,
      driftDismissed: false,
      recalculated: false,
    })
  }
}
