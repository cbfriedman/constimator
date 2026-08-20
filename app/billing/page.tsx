import { CreditCard } from "lucide-react"

import { createBillingPortalSessionAction, createCheckoutSessionAction } from "@/app/billing/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProjectHeader } from "@/components/project-header"
import { getBillingStatus } from "@/lib/billing"
import { getScopedDb } from "@/lib/db/scoped"
import { syncSubscriptionSeats } from "@/lib/seat-sync"
import { formatMoney, getSeatPriceDisplay } from "@/lib/stripe"

const STATUS_LABELS: Record<string, string> = {
  none: "No subscription yet",
  trialing: "Trialing",
  active: "Active",
  past_due: "Payment past due",
  canceled: "Canceled",
  unpaid: "Unpaid",
  incomplete: "Incomplete",
  incomplete_expired: "Incomplete (expired)",
  paused: "Paused",
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

export default async function BillingPage() {
  const scopedDb = await getScopedDb()

  // Reconcile the Stripe quantity against the org's real headcount before
  // rendering, so the seat count shown below is the one being billed. Never
  // throws — see lib/seat-sync.ts.
  await syncSubscriptionSeats(scopedDb)

  const [org, members, seatPrice] = await Promise.all([
    scopedDb.org.get(),
    scopedDb.users.findMany(),
    getSeatPriceDisplay(),
  ])

  if (!org) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        <p className="text-sm text-muted-foreground">No organization found.</p>
      </div>
    )
  }

  const billing = getBillingStatus(org)
  const hasStripeAccount = Boolean(org.stripeCustomerId)
  const seats = Math.max(1, members.length)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-8">
      <ProjectHeader title="Billing" subtitle={org.name} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium text-foreground">
              {STATUS_LABELS[billing.status] ?? billing.status}
            </span>
          </div>

          {billing.isOnFreeTrial ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Free trial ends</span>
              <span className="font-medium text-foreground">{formatDate(billing.trialEndsAt)}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Seats</span>
            <span className="font-medium text-foreground tabular-nums">
              {seats} {seats === 1 ? "user" : "users"}
            </span>
          </div>

          {seatPrice ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Price per seat</span>
                <span className="font-medium text-foreground tabular-nums">
                  {seatPrice.perSeat} / {seatPrice.interval}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {billing.isEntitled && hasStripeAccount ? "Current total" : "Total if you subscribe"}
                </span>
                <span className="font-medium text-foreground tabular-nums">
                  {formatMoney(seatPrice.unitAmount * seats, seatPrice.currency)} /{" "}
                  {seatPrice.interval}
                </span>
              </div>
            </>
          ) : null}

          {billing.currentPeriodEnd ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {billing.status === "canceled" ? "Access until" : "Renews"}
              </span>
              <span className="font-medium text-foreground">
                {formatDate(billing.currentPeriodEnd)}
              </span>
            </div>
          ) : null}

          {!billing.isEntitled ? (
            <p className="text-sm text-warning">
              Your trial has ended. Subscribe to keep using the estimating workspace.
            </p>
          ) : null}

          <p className="text-sm text-muted-foreground">
            Billed per user. Adding or removing a teammate adjusts your seat count
            and is prorated on your next invoice. Checkout accepts cards and Google
            Pay; recurring charges use the method you authorize there.
          </p>

          <div className="flex gap-3 border-t pt-4">
            {hasStripeAccount ? (
              <form action={createBillingPortalSessionAction}>
                <Button type="submit" variant="outline">
                  Manage Billing
                </Button>
              </form>
            ) : null}
            {!billing.isEntitled || !hasStripeAccount ? (
              <form action={createCheckoutSessionAction}>
                <Button type="submit">
                  <CreditCard data-icon="inline-start" />
                  {hasStripeAccount ? "Resubscribe" : "Subscribe"}
                </Button>
              </form>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
