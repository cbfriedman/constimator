import "server-only"

import type { orgs } from "@/db/schema"

type OrgRow = typeof orgs.$inferSelect

// Free trial length for a brand-new org with no Stripe subscription yet —
// computed from org.createdAt rather than stored as its own column, since
// it's a pure function of a value we already have.
export const TRIAL_DAYS = 30

// Stripe statuses that mean "the org gets to use paid features right now."
// trialing here means Stripe's own subscription trial (started a
// subscription with a trial period configured on the Price), which is a
// different thing from the pre-Stripe free trial below — both count.
const ENTITLED_SUBSCRIPTION_STATUSES = new Set<OrgRow["subscriptionStatus"]>([
  "trialing",
  "active",
])

export type BillingStatus = {
  status: OrgRow["subscriptionStatus"]
  isEntitled: boolean
  /** True specifically for the pre-Stripe free trial (status === "none", still inside the window) — distinct from Stripe's own "trialing" status. */
  isOnFreeTrial: boolean
  trialEndsAt: Date
  currentPeriodEnd: Date | null
}

/**
 * Pure function of an already-fetched org row — no DB access itself, so
 * every call site (page-level gating, the billing-status API used by
 * ProjectStateProvider, the AI-queueing check in
 * app/upload/actions.ts) computes the exact same answer from the exact
 * same inputs, and it's directly unit-testable (see billing.test.ts).
 */
export function getBillingStatus(org: OrgRow): BillingStatus {
  const trialEndsAt = new Date(org.createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
  const isOnFreeTrial = org.subscriptionStatus === "none" && Date.now() < trialEndsAt.getTime()
  const isEntitled = isOnFreeTrial || ENTITLED_SUBSCRIPTION_STATUSES.has(org.subscriptionStatus)

  return {
    status: org.subscriptionStatus,
    isEntitled,
    isOnFreeTrial,
    trialEndsAt,
    currentPeriodEnd: org.currentPeriodEnd,
  }
}
