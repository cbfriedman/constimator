import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import type Stripe from "stripe"

import { orgs, subscriptionStatusEnum } from "@/db/schema"
import { getSystemDb } from "@/lib/db/system"
import { logger } from "@/lib/logger"
import { getStripe } from "@/lib/stripe"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Stripe's own SDK types subscription.status as "one of these known
// values, or a string we don't have a type for yet" — an intentional
// forward-compat escape hatch for when Stripe adds a new status before
// this SDK version knows about it. Our subscription_status Postgres enum
// has no such escape hatch, so an unrecognized value has to be handled
// explicitly rather than blindly cast (which is exactly what the
// type error here was pointing at).
type DbSubscriptionStatus = (typeof subscriptionStatusEnum.enumValues)[number]
const KNOWN_STATUSES = new Set<string>(subscriptionStatusEnum.enumValues)

function toDbSubscriptionStatus(status: string): DbSubscriptionStatus | null {
  return KNOWN_STATUSES.has(status) ? (status as DbSubscriptionStatus) : null
}

// This is Stripe calling us, not a signed-in org — there's no session, no
// "current org" to scope to, and the org being updated is whichever one
// the event is actually about. Same narrow cross-org exception as
// app/api/health (step 29); see lib/db/system.ts.
async function findOrgIdForSubscription(
  db: ReturnType<typeof getSystemDb>,
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const metadataOrgId = subscription.metadata?.orgId
  if (metadataOrgId) return metadataOrgId

  // Fallback for a subscription that somehow didn't carry our metadata
  // (e.g. created directly in the Stripe Dashboard against an existing
  // customer) — look up by the Stripe customer id we stored at checkout.
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
  const [org] = await db
    .select({ id: orgs.id })
    .from(orgs)
    .where(eq(orgs.stripeCustomerId, customerId))
    .limit(1)
  return org?.id ?? null
}

async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const db = getSystemDb()
  const orgId = await findOrgIdForSubscription(db, subscription)
  if (!orgId) {
    logger.error("Stripe subscription webhook: no matching org", {
      subscriptionId: subscription.id,
      customerId:
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
    })
    return
  }

  const status = toDbSubscriptionStatus(subscription.status)
  if (!status) {
    // Stripe added a status this app doesn't know how to interpret yet —
    // fail loud rather than silently writing something wrong or crashing
    // the whole webhook (other event types still need to process).
    logger.error("Stripe subscription webhook: unrecognized status", {
      orgId,
      subscriptionId: subscription.id,
      status: subscription.status,
    })
    return
  }

  // current_period_end lives on each subscription item as of recent Stripe
  // API versions, not on the subscription itself — this app only ever
  // creates one item (the seat price), so the first item's period is the
  // subscription's period.
  const periodEndUnix = subscription.items.data[0]?.current_period_end
  const currentPeriodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : null

  await db
    .update(orgs)
    .set({
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: status,
      currentPeriodEnd,
    })
    .where(eq(orgs.id, orgId))

  logger.info("Synced Stripe subscription", {
    orgId,
    subscriptionId: subscription.id,
    status: subscription.status,
  })
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 })
  }

  // Must be the raw, untouched body — signature verification hashes the
  // exact bytes Stripe sent. Parsing as JSON first (even just to inspect
  // it) would re-serialize and break verification.
  const rawBody = await request.text()

  let event: Stripe.Event
  try {
    event = await getStripe().webhooks.constructEventAsync(rawBody, signature, webhookSecret)
  } catch (err) {
    logger.error("Stripe webhook signature verification failed", undefined, err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        const orgId = session.client_reference_id
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id
        if (orgId && customerId) {
          const db = getSystemDb()
          await db.update(orgs).set({ stripeCustomerId: customerId }).where(eq(orgs.id, orgId))
        }
        // Subscription status/period itself is synced by the
        // customer.subscription.created event Stripe fires alongside this
        // one — kept in one place (syncSubscription) rather than
        // duplicating the status mapping here too.
        break
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object)
        break
      default:
        // Not every event type needs a handler — unhandled ones are
        // expected, not an error.
        break
    }
  } catch (err) {
    logger.error("Stripe webhook handler failed", { eventType: event.type, eventId: event.id }, err)
    // 500 so Stripe retries (its own webhook delivery has built-in retry
    // with backoff) — a transient DB blip shouldn't silently drop a
    // billing state change.
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
