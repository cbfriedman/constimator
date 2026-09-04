"use server"

import { eq, inArray } from "drizzle-orm"

import { getEstimateData } from "@/app/estimate/actions"
import { documents, estimates, projects, reviewRequests, takeoffJobs, users } from "@/db/schema"
import {
  getScopedDb,
  NoOrgMembershipError,
  UnauthenticatedError,
} from "@/lib/db/scoped"
import { getBillingStatus } from "@/lib/billing"
import { pendingBidFormExtractions } from "@/lib/bid-form-import"
import {
  getBidsForProject,
  getCurrentProject,
  getOrCreateCurrentEstimate,
  persistCurrentProjectId,
} from "@/lib/current-project"
import { formatDisplayDate, todayIsoDate } from "@/lib/format-date"
import { logger } from "@/lib/logger"
import { parseInput, uuidSchema } from "@/lib/validation"
import { computeDaysOut } from "@/lib/projects"
import { withProjectQuery } from "@/lib/project-scope"
import { diffBidAgainstEstimate } from "@/lib/reconciliation-diff"

export type WorkspaceProjectOption = {
  id: string
  name: string
  number: string
}

export type WorkspaceNotification = {
  id: string
  title: string
  body: string
  href: string
  tone: "warning" | "danger" | "info"
}

export type ProjectStateSnapshot = {
  // Every project in the org, for the sidebar switcher. Sorted newest first
  // so the list matches what a contractor just created.
  projects: WorkspaceProjectOption[]
  notifications: WorkspaceNotification[]
  reviewStatus: "requested" | "in_progress" | "completed" | null
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

    const projectRows = await scopedDb.projects.findMany()
    const project = await getCurrentProject(scopedDb)
    const estimate = project
      ? await getOrCreateCurrentEstimate(scopedDb, project.id)
      : null

    let reconciliationAttentionCount = 0
    let pendingBidFormCount = 0
    let failedJobCount = 0
    let reviewStatus: ProjectStateSnapshot["reviewStatus"] = null

    if (project && estimate) {
      const [bidRows, { rows: estimateLineRows }, docs, reviewRows] =
        await Promise.all([
          getBidsForProject(scopedDb, project.id),
          getEstimateData(),
          scopedDb.documents.findMany(eq(documents.projectId, project.id)),
          scopedDb.reviewRequests.findMany(
            eq(reviewRequests.projectId, project.id),
          ),
        ])
      if (bidRows.length > 0) {
        reconciliationAttentionCount = diffBidAgainstEstimate(
          bidRows,
          estimateLineRows,
        ).filter((diff) => diff.attention).length
      }

      const latestReview = [...reviewRows].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0]
      reviewStatus = latestReview?.status ?? null

      if (docs.length > 0) {
        const jobs = await scopedDb.takeoffJobs.findMany(
          inArray(
            takeoffJobs.documentId,
            docs.map((doc) => doc.id),
          ),
        )
        failedJobCount = jobs.filter((job) => job.status === "failed").length
        pendingBidFormCount = pendingBidFormExtractions(jobs, docs, bidRows).length
      }
    }

    const billingStatus = getBillingStatus(org)
    const currentHref = (path: string) => withProjectQuery(path, project?.id ?? null)

    const notifications: WorkspaceNotification[] = []
    if (!org.costSetupComplete) {
      notifications.push({
        id: "cost-setup",
        title: "Cost Setup is incomplete",
        body: "Company rates need finishing before totals are final.",
        href: "/cost-setup",
        tone: "warning",
      })
    }
    if (estimate?.rateDrift && !estimate.driftDismissed) {
      notifications.push({
        id: "rate-drift",
        title: "Company rates changed",
        body: "Recalculate the estimate against current rates.",
        href: currentHref("/estimate"),
        tone: "warning",
      })
    }
    if (reconciliationAttentionCount > 0) {
      notifications.push({
        id: "recon",
        title: `${reconciliationAttentionCount} reconciliation item${reconciliationAttentionCount === 1 ? "" : "s"} need attention`,
        body: "Missing items, quantity mismatches, or unit mismatches.",
        href: currentHref("/reconciliation"),
        tone: "danger",
      })
    }
    if (pendingBidFormCount > 0) {
      notifications.push({
        id: "bid-form",
        title: "Extracted bid form ready to import",
        body: "Review AI-extracted bid items before they become official.",
        href: currentHref("/reconciliation"),
        tone: "info",
      })
    }
    if (failedJobCount > 0) {
      notifications.push({
        id: "processing",
        title: `${failedJobCount} document${failedJobCount === 1 ? "" : "s"} failed to process`,
        body: "Retry from AI Processing.",
        href: currentHref("/processing"),
        tone: "danger",
      })
    }
    if (reviewStatus === "requested" || reviewStatus === "in_progress") {
      notifications.push({
        id: "review",
        title: "Human review in progress",
        body: "We'll follow up on the request for this project.",
        href: currentHref("/review"),
        tone: "info",
      })
    }

    const projectOptions: WorkspaceProjectOption[] = [...projectRows]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => ({ id: row.id, name: row.name, number: row.number }))

    return {
      projects: projectOptions,
      notifications,
      reviewStatus,
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

export async function selectCurrentProjectAction(rawProjectId: string): Promise<void> {
  const projectId = parseInput(uuidSchema, rawProjectId)
  const scopedDb = await getScopedDb()
  const project = await scopedDb.projects.findFirst(eq(projects.id, projectId))
  if (!project) {
    throw new Error("Project not found.")
  }
  await persistCurrentProjectId(project.id)
}
