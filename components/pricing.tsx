import { ArrowRight, Check } from "lucide-react"

// Two claims from the original draft are gone, because the code doesn't back
// them and there's no reason to build limits nobody asked for:
//
//   "15 projects per month"  — there is no project quota anywhere in the
//                              codebase. Projects are unlimited today. Saying
//                              15 would have invented a cap and then required
//                              us to go build it.
//   "Unlimited pages"        — not quite true. Document processing pauses when
//                              an org crosses its monthly AI spend limit
//                              (Settings → Monthly AI usage limit, $20 default).
//                              Stated as the budget it actually is instead.
//
// PRICING MODEL: per seat, matching what the app actually bills. Checkout in
// app/billing/actions.ts sets quantity to the org's live user count, reconciled
// on load by lib/seat-sync.ts, per the Billing decision in docs/DECISIONS.md.
//
// This page briefly quoted a flat per-company rate, which meant /billing quoted
// a 5-person contractor five times what the homepage did. Both numbers below are
// per user, and the note under the CTA says so, so the price a prospect reads
// here is the price the "Total if you subscribe" row shows them later.
const REGULAR_PRICE = "$249"
const FOUNDING_PRICE = "$124"
const SPOTS = 20

const includes = [
  "Unlimited projects and bid forms",
  "Full bid-form reconciliation, PDF and Excel exports",
  "Document reading, with a monthly AI budget you set",
  "Direct input on the product roadmap",
  "Founding rate locked for life",
]

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-16 border-t border-border bg-muted/50">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Pricing</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Founding members
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">
            We&apos;re bringing on a small group of founding contractors to shape Constimator and
            lock in founding pricing as we grow.
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-md">
          <div className="overflow-hidden rounded-2xl border-2 border-primary bg-card shadow-lg">
            <div className="bg-primary px-6 py-2.5 text-center text-sm font-semibold uppercase tracking-widest text-primary-foreground">
              Founding member
            </div>

            <div className="p-8">
              <div className="flex items-baseline justify-center gap-1">
                <span className="font-display text-6xl font-bold tabular-nums">
                  {FOUNDING_PRICE}
                </span>
                <span className="text-lg font-medium text-muted-foreground">
                  per user / month
                </span>
              </div>

              <p className="mt-3 text-center text-sm text-muted-foreground">
                <span className="line-through">{REGULAR_PRICE} per user</span> regular price — 50%
                off, locked for life
              </p>

              <ul className="mt-8 flex flex-col gap-3.5">
                {includes.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              <a
                href="mailto:support@constimator.com?subject=Constimator Founding Access"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
              >
                Request founding access
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>

              <p className="mt-4 text-center text-sm font-medium text-muted-foreground">
                Only {SPOTS} spots available
              </p>
            </div>
          </div>

          {/* Says the same thing app/billing/page.tsx says, in the same words,
              so the seat mechanics aren't a surprise discovered at checkout. */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Billed per user. Add or remove an estimator any time — your seat count adjusts and
            prorates on the next invoice.
          </p>

          <p className="mt-3 text-center text-sm text-muted-foreground">
            Every account starts with 30 days free and no credit card — run a real bid through it
            before you pay anything.
          </p>
        </div>
      </div>
    </section>
  )
}
