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

export type SeatPriceDisplay = {
  /** e.g. "$49.00" — already localised and currency-symbolled. */
  perSeat: string
  /** e.g. "month" */
  interval: string
  /** Raw minor units, for computing a total without re-parsing the string. */
  unitAmount: number
  currency: string
}

/**
 * The seat price as configured in Stripe, for showing a customer what they
 * will be charged *before* they land on Checkout. Until this existed the
 * only place a price appeared anywhere in the product was Stripe's own
 * hosted page, after the user had already committed to subscribing.
 *
 * Returns null rather than throwing on any failure — a missing price
 * shouldn't take down /billing, it should just fall back to not quoting a
 * number.
 */
export async function getSeatPriceDisplay(): Promise<SeatPriceDisplay | null> {
  try {
    const price = await getStripe().prices.retrieve(getSeatPriceId())
    if (price.unit_amount == null || !price.recurring) return null

    return {
      perSeat: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: price.currency,
      }).format(price.unit_amount / 100),
      interval: price.recurring.interval,
      unitAmount: price.unit_amount,
      currency: price.currency,
    }
  } catch {
    return null
  }
}

export function formatMoney(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minorUnits / 100)
}

// Cards on hosted Subscribe Checkout. Google Pay (and Apple Pay) are
// Stripe card wallets — they show on Checkout automatically when `card`
// is enabled; there is no separate `google_pay` payment_method_type.
// Venmo is not a Stripe method. Cash App Pay is not in this list so
// Subscribe does not depend on that Dashboard toggle.
export const CHECKOUT_PAYMENT_METHOD_TYPES = ["card"] as const
