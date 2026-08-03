import "server-only"

import Stripe from "stripe"

// Lazily constructed, same reasoning as lib/db/client.ts's getDb() — this
// module gets imported (transitively, via components that read billing
// status) on effectively every route, so evaluating STRIPE_SECRET_KEY at
// import time would crash pages that never actually create a Stripe
// object. Every caller already handles a missing key as a normal thrown
// error at call time (see app/billing/actions.ts).
let instance: Stripe | null = null

export function getStripe(): Stripe {
  if (!instance) {
    const apiKey = process.env.STRIPE_SECRET_KEY
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY is not set")
    }
    instance = new Stripe(apiKey)
  }
  return instance
}

// The one seat-priced Product/Price this app sells (see docs/DECISIONS.md
// and lib/billing.ts for why seat-based, and db/schema.ts's org table for
// the subscription fields). Single plan for now — no tiers — set up once
// in the Stripe Dashboard (Product catalog → create a recurring price,
// billed per unit) and its id pasted into this env var. Not something
// this app can create on its own without a live Stripe account.
export function getSeatPriceId(): string {
  const priceId = process.env.STRIPE_SEAT_PRICE_ID
  if (!priceId) {
    throw new Error("STRIPE_SEAT_PRICE_ID is not set")
  }
  return priceId
}
