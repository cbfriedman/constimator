import "server-only"

import type { ScopedDb } from "@/lib/current-project"
import { logger } from "@/lib/logger"
import { getSeatPriceId, getStripe } from "@/lib/stripe"

// Seat quantity was set once, at checkout, from the org's live user count
// (app/billing/actions.ts) and never touched again. An org that subscribed
// at 2 seats and then grew to 6 through app/team/ kept paying for 2 —
// docs/DECISIONS.md flagged this as a real gap under the Billing model
// decision. This closes it.
//
// Why reconcile rather than hook the moment a teammate joins: membership
// grows inside Postgres, in migration 0008's handle_new_user() signup
// trigger, when an invited person completes signup. The app never runs
// code at that instant, so there is nothing to hook. Instead both places
// that show billing or team state reconcile on load — cheap, idempotent,
// and self-healing if a sync is ever missed.

/** Stripe subscription statuses whose seat count is worth correcting. A cancelled or unpaid subscription shouldn't be re-priced. */
const SYNCABLE_STATUSES = new Set(["active", "trialing", "past_due"])

export type SeatSyncResult =
  | { synced: false; reason: "no-subscription" | "not-syncable" | "already-correct" | "error" }
  | { synced: true; from: number; to: number }

/**
 * Brings the org's Stripe subscription quantity in line with its real user
 * count. Safe to call on any page load: it no-ops without a subscription,
 * and never throws — a Stripe outage should not take down /billing or
 * /team, it should just leave the quantity to be corrected on a later load.
 */
export async function syncSubscriptionSeats(scopedDb: ScopedDb): Promise<SeatSyncResult> {
  try {
    const org = await scopedDb.org.get()
    if (!org?.stripeSubscriptionId) return { synced: false, reason: "no-subscription" }
    if (!SYNCABLE_STATUSES.has(org.subscriptionStatus)) {
      return { synced: false, reason: "not-syncable" }
    }

    const users = await scopedDb.users.findMany()
    const seats = Math.max(1, users.length)

    const stripe = getStripe()
    const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId)

    // Stripe's own status is authoritative here, not our mirrored copy —
    // the webhook that updates org.subscriptionStatus can lag, and we're
    // about to change what this customer is charged.
    if (!SYNCABLE_STATUSES.has(subscription.status)) {
      return { synced: false, reason: "not-syncable" }
    }

    // Exact price match only — no `?? items.data[0]` fallback.
    //
    // Everything sold through app/billing/actions.ts carries the seat price, so
    // for a normal self-serve subscription this is the same item the fallback
    // would have found. The difference is what happens for a subscription that
    // *doesn't* carry it: a founding-member rate created by hand in the Stripe
    // Dashboard, a grandfathered price, any one-off deal. The fallback silently
    // re-quantitied those to the org's headcount on the next /billing or /team
    // load, turning a negotiated price into a multiple of itself with
    // prorations — and doing it on a page load, with nobody having asked.
    //
    // A subscription that isn't on the seat price isn't seat-billed, so there
    // is nothing here to reconcile. Leave it alone.
    const seatPriceId = getSeatPriceId()
    const item = subscription.items.data.find((line) => line.price.id === seatPriceId)
    if (!item) return { synced: false, reason: "not-syncable" }

    if (item.quantity === seats) return { synced: false, reason: "already-correct" }

    const from = item.quantity ?? 0
    await stripe.subscriptionItems.update(item.id, {
      quantity: seats,
      // Bill the difference on the next invoice rather than silently
      // changing the price mid-period with no line item explaining it.
      proration_behavior: "create_prorations",
    })

    logger.info("Synced Stripe seat quantity", {
      orgId: scopedDb.orgId,
      subscriptionId: subscription.id,
      from,
      to: seats,
    })

    return { synced: true, from, to: seats }
  } catch (err) {
    logger.error("Failed to sync Stripe seat quantity", { orgId: scopedDb.orgId }, err)
    return { synced: false, reason: "error" }
  }
}
