"use server"

import { eq } from "drizzle-orm"

import { getEstimateData } from "@/app/estimate/actions"
import { estimates, users } from "@/db/schema"
import {
  getScopedDb,
  NoOrgMembershipError,
  UnauthenticatedError,
} from "@/lib/db/scoped"
import { getBillingStatus } from "@/lib/billing"
import {
  getBidsForProject,
  getCurrentProject,
  getOrCreateCurrentEstimate,
} from "@/lib/current-project"
import { formatDisplayDate, todayIsoDate } from "@/lib/format-date"
import { logger } from "@/lib/logger"
import { computeDaysOut } from "@/lib/projects"
import { diffBidAgainstEstimate } from "@/lib/reconciliation-diff"

export type ProjectStateSnapshot = {
  // The org's current project (see lib/current-project.ts) — null when the
  // org has no projects yet. Read by the sidebar so "Upload Documents"
  // links to a real project instead of dead-ending on "No project selected."
  currentProjectId: string | null
  // Real name/number for the same current project — the sidebar's project
  // panel used to always show the fixed sample project (Shasta County)
  // regardless of what the org's real current project actually was.
  currentProjectName: string | null
  currentProjectNumber: string | null
  // Real days-until-bid for the current project — the single source every
  // "N days to bid" chip (BidCountdownBadge) and the dashboard's deadline
  // card both read, so they can't drift out of sync with each other again.
  currentProjectDaysOut: number | null
  // The real signed-in user + org — TopBar's account menu used to show a
  // hardcoded fake identity regardless of who was actually signed in,
  // found during a pre-launch audit.
  user: { name: string; email: string; initials: string }
  orgName: string
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

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (first + last).toUpperCase() || "?"
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
    const [org, currentUser] = await Promise.all([
      scopedDb.org.get(),
      scopedDb.users.findFirst(eq(users.id, scopedDb.userId)),
    ])
    if (!org) return null

    const userName = currentUser?.fullName?.trim() || currentUser?.email.split("@")[0] || "You"
    const userEmail = currentUser?.email ?? ""

    const project = await getCurrentProject(scopedDb)
    const estimate = project
      ? await getOrCreateCurrentEstimate(scopedDb, project.id)
      : null

    let reconciliationAttentionCount = 0
    if (project && estimate) {
      // Both cached per request — getBidsForProject and getEstimateData are
      // the same calls getReconciliationData() makes for /reconciliation and
      // /reports, so on those routes this is a cache hit, not a second
      // round-trip. See lib/current-project.ts for why this needed caching.
      const [bidRows, { rows: estimateLineRows }] = await Promise.all([
        getBidsForProject(scopedDb, project.id),
        getEstimateData(),
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
      currentProjectName: project?.name ?? null,
      currentProjectNumber: project?.number ?? null,
      currentProjectDaysOut: project ? computeDaysOut(project.bidDate) : null,
      user: { name: userName, email: userEmail, initials: initialsFor(userName) },
      orgName: org.name,
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
