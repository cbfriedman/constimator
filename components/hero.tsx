import { ArrowRight } from "lucide-react"

import { SocialProofBar } from "@/components/social-proof-bar"

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-4xl px-4 pb-14 pt-14 text-center sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
        <SocialProofBar />

        <h1 className="mt-8 font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
          You lost the job by $4,000 on a $2M bid.{" "}
          <span className="text-primary">The missing item was on page 47.</span>
        </h1>

        {/* This used to lead with "Constimator reads your plans, specs, addenda,
            and the official bid form". docs/PILOT_CHECKLIST.md puts AI plan
            reading explicitly out of scope for the pilot — the worker runs, but
            it hasn't been validated against real drawings — while the page was
            selling it as the headline capability. Reconciliation is both the
            real differentiator and the part that's actually pilot-tested, so it
            leads. Document reading is still on the page, labelled honestly, in
            <Features /> and the FAQ. */}
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
          Constimator reconciles your estimate against the official bid form, line by line —
          catching the missing items, quantity busts, and unit mismatches that cost contractors
          jobs.
        </p>

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
          >
            Analyze your first project — free
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            See how it works
          </a>
        </div>

        {/* The draft wanted "Catch your first error or pay nothing" here. That's
            an unbounded refund promise with nothing behind it — but the thing it
            promises is already true and already has a mechanism: TRIAL_DAYS in
            lib/billing.ts gives every new org 30 days with no Stripe involvement
            at all, so nobody can be charged before they've seen what it catches.
            Said that way instead. If TRIAL_DAYS changes, this line changes. */}
        <p className="mt-5 text-sm text-muted-foreground">
          No credit card required · 30 days free · See what it catches on a real bid before you
          pay anything
        </p>
      </div>
    </section>
  )
}
