import { describe, expect, it } from "vitest"

import type { orgs } from "@/db/schema"
import { getBillingStatus, TRIAL_DAYS } from "./billing"

type OrgRow = typeof orgs.$inferSelect

function makeOrg(overrides: Partial<OrgRow> = {}): OrgRow {
  return {
    id: "org-1",
    name: "Test Org",
    slug: "test-org",
    costSetupComplete: false,
    aiMonthlySpendCapUsd: "20.00",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: "none",
    currentPeriodEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

describe("getBillingStatus", () => {
  it("entitles a brand-new org (no Stripe subscription) on its free trial", () => {
    const org = makeOrg({ subscriptionStatus: "none", createdAt: new Date() })
    const result = getBillingStatus(org)

    expect(result.isOnFreeTrial).toBe(true)
    expect(result.isEntitled).toBe(true)
  })

  it("does not entitle an org whose free trial has expired with no subscription", () => {
    const org = makeOrg({
      subscriptionStatus: "none",
      createdAt: new Date(Date.now() - (TRIAL_DAYS + 1) * DAY_MS),
    })
    const result = getBillingStatus(org)

    expect(result.isOnFreeTrial).toBe(false)
    expect(result.isEntitled).toBe(false)
  })

  it("is not entitled at the exact trial boundary instant (createdAt + TRIAL_DAYS)", () => {
    // trialEndsAt = createdAt + TRIAL_DAYS exactly — "now" at that instant
    // should not count as still inside the window (strict less-than).
    const createdAt = new Date(Date.now() - TRIAL_DAYS * DAY_MS)
    const org = makeOrg({ subscriptionStatus: "none", createdAt })
    const result = getBillingStatus(org)

    expect(result.isOnFreeTrial).toBe(false)
    expect(result.isEntitled).toBe(false)
  })

  it("entitles an org with an active Stripe subscription regardless of trial window", () => {
    const org = makeOrg({
      subscriptionStatus: "active",
      createdAt: new Date(Date.now() - 365 * DAY_MS),
    })
    const result = getBillingStatus(org)

    expect(result.isEntitled).toBe(true)
    expect(result.isOnFreeTrial).toBe(false)
  })

  it("entitles an org on Stripe's own trialing status, distinct from the pre-Stripe free trial", () => {
    const org = makeOrg({
      subscriptionStatus: "trialing",
      createdAt: new Date(Date.now() - 365 * DAY_MS),
    })
    const result = getBillingStatus(org)

    expect(result.isEntitled).toBe(true)
    expect(result.isOnFreeTrial).toBe(false)
  })

  it.each(["past_due", "canceled", "unpaid", "incomplete", "incomplete_expired", "paused"] as const)(
    "does not entitle a %s subscription, even during what would be the free-trial window",
    (status) => {
      const org = makeOrg({ subscriptionStatus: status, createdAt: new Date() })
      const result = getBillingStatus(org)

      expect(result.isEntitled).toBe(false)
    },
  )

  it("computes trialEndsAt as exactly createdAt + TRIAL_DAYS", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z")
    const org = makeOrg({ createdAt })
    const result = getBillingStatus(org)

    expect(result.trialEndsAt.toISOString()).toBe(
      new Date(createdAt.getTime() + TRIAL_DAYS * DAY_MS).toISOString(),
    )
  })

  it("passes currentPeriodEnd through unchanged", () => {
    const currentPeriodEnd = new Date("2026-03-01T00:00:00.000Z")
    const org = makeOrg({ subscriptionStatus: "active", currentPeriodEnd })
    const result = getBillingStatus(org)

    expect(result.currentPeriodEnd).toEqual(currentPeriodEnd)
  })
})
