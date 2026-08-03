"use server"

import { eq } from "drizzle-orm"

import { bids, estimateLines, estimates } from "@/db/schema"
import {
  getScopedDb,
  NoOrgMembershipError,
  UnauthenticatedError,
} from "@/lib/db/scoped"
import { getBillingStatus } from "@/lib/billing"
import { getCurrentProject, getOrCreateCurrentEstimate } from "@/lib/current-project"
import { formatDisplayDate, todayIsoDate } from "@/lib/format-date"
import { logger } from "@/lib/logger"
import { computeDaysOut } from "@/lib/projects"
import { diffBidAgainstEstimate } from "@/lib/reconciliation-diff"

export type ProjectStateSnapshot = {
  // The org's current project (see lib/current-project.ts) — null when the
  // org has no projects yet. Read by the sidebar so "Upload Documents"
  // links to a real project instead of dead-ending on "No project selected."
  currentProjectId: string | null
  // Real days-until-bid for the current project — the single source every
  // "N days to bid" chip (BidCountdownBadge) and the dashboard's deadline
  // card both read, so they can't drift out of sync with each other again.
  currentProjectDaysOut: number | null
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
  // Real count of bid-vs-estimate diff rows needing attention, for the
  // sidebar badge / dashboard stat card — computed with the same pure diff
  // used by the reconciliation page itself, but without writing
  // reconciliation_item rows (this runs on every route via the root layout,
  // so it stays read-only rather than rewriting DB rows on every nav).
  reconciliationAttentionCount: number
  // Step 31 — read by components/billing-gate.tsx via ProjectStateProvider,
  // same pattern as every other field here.
  billing: {
    status: string
    isEntitled: boolean
    isOnFreeTrial: boolean
    trialEndsAt: string
    currentPeriodEnd: string | null
  }
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

    const project = await getCurrentProject(scopedDb)
    const estimate = project
      ? await getOrCreateCurrentEstimate(scopedDb, project.id)
      : null

    let reconciliationAttentionCount = 0
    if (project && estimate) {
      const [bidRows, estimateLineRows] = await Promise.all([
        scopedDb.bids.findMany(eq(bids.projectId, project.id)),
        scopedDb.estimateLines.findMany(eq(estimateLines.estimateId, estimate.id)),
      ])
      if (bidRows.length > 0) {
        reconciliationAttentionCount = diffBidAgainstEstimate(
          bidRows,
          estimateLineRows,
        ).filter((diff) => diff.attention).length
      }
    }

    const billingStatus = getBillingStatus(org)

    return {
      currentProjectId: project?.id ?? null,
      currentProjectDaysOut: project ? computeDaysOut(project.bidDate) : null,
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
      reconciliationAttentionCount,
      billing: {
        status: billingStatus.status,
        isEntitled: billingStatus.isEntitled,
        isOnFreeTrial: billingStatus.isOnFreeTrial,
        trialEndsAt: billingStatus.trialEndsAt.toISOString(),
        currentPeriodEnd: billingStatus.currentPeriodEnd?.toISOString() ?? null,
      },
    }
  } catch (err) {
    const isExpected =
      err instanceof UnauthenticatedError ||
      err instanceof NoOrgMembershipError ||
      (err as { digest?: string } | null)?.digest === "DYNAMIC_SERVER_USAGE"
    if (!isExpected) {
      logger.error("getProjectStateSnapshot failed, falling back to defaults", undefined, err)
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
