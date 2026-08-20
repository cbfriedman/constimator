"use server"

import { redirect } from "next/navigation"

import { getAppOrigin } from "@/lib/app-url"
import { getScopedDb } from "@/lib/db/scoped"
import { CHECKOUT_PAYMENT_METHOD_TYPES, getSeatPriceId, getStripe } from "@/lib/stripe"

// Gets (or lazily creates) this org's Stripe Customer. Stored on the org
// row so every future Checkout/portal session reuses the same customer
// instead of Stripe accumulating a duplicate per subscribe attempt.
async function getOrCreateStripeCustomer(
  scopedDb: Awaited<ReturnType<typeof getScopedDb>>,
): Promise<string> {
  const org = await scopedDb.org.get()
  if (!org) {
    throw new Error("Org not found.")
  }
  if (org.stripeCustomerId) {
    return org.stripeCustomerId
  }

  const stripe = getStripe()
  const customer = await stripe.customers.create({
    name: org.name,
    // orgId in metadata is the belt-and-suspenders lookup path the
    // webhook handler uses when a customer.* event arrives with no
    // subscription metadata of its own yet — see
    // app/api/webhooks/stripe/route.ts.
    metadata: { orgId: org.id },
  })

  await scopedDb.org.update({ stripeCustomerId: customer.id })
  return customer.id
}

/**
 * Starts (or resumes) a seat-based subscription checkout for the caller's
 * own org. Seat quantity is the org's current user count, read live —
 * step 32 built the team-invite flow that actually grows this past 1.
 * Redirects to Stripe's hosted Checkout page; the subscription itself only
 * becomes real once the webhook handler processes checkout.session.completed.
 */
export async function createCheckoutSessionAction() {
  const scopedDb = await getScopedDb()
  const [customerId, users, origin] = await Promise.all([
    getOrCreateStripeCustomer(scopedDb),
    scopedDb.users.findMany(),
    getAppOrigin(),
  ])

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: scopedDb.orgId,
    payment_method_types: [...CHECKOUT_PAYMENT_METHOD_TYPES],
    line_items: [{ price: getSeatPriceId(), quantity: Math.max(1, users.length) }],
    subscription_data: { metadata: { orgId: scopedDb.orgId } },
    success_url: `${origin}/billing?checkout=success`,
    cancel_url: `${origin}/billing?checkout=cancelled`,
  })

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout URL.")
  }

  redirect(session.url)
}

/**
 * Opens Stripe's hosted billing portal (update payment method, view
 * invoices, cancel) for the caller's own org. Requires a Stripe customer
 * to already exist — i.e. checkout has run at least once.
 */
export async function createBillingPortalSessionAction() {
  const scopedDb = await getScopedDb()
  const org = await scopedDb.org.get()
  if (!org?.stripeCustomerId) {
    throw new Error("No billing account yet — subscribe first.")
  }

  const stripe = getStripe()
  const origin = await getAppOrigin()
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${origin}/billing`,
  })

  redirect(session.url)
}
