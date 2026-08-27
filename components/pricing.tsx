import { ArrowRight, Check } from "lucide-react"

// NOTE: nothing in lib/billing.ts enforces "15 projects/month" or a $124 vs
// $249 price today — the only billing rule in code is the 30-day trial
// (TRIAL_DAYS) and the per-org monthly AI spend cap. These are the numbers you
// are committing to in public, so wire the Stripe price and the project quota
// up to match before the pilot goes live, or the first founding member to count
// their projects finds the gap.
const REGULAR_PRICE = "$249"
const FOUNDING_PRICE = "$124"
const SPOTS = 20

const includes = [
  "15 projects per month",
  "Unlimited pages per project",
  "Full bid-form reconciliation and exports",
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
                <span className="text-lg font-medium text-muted-foreground">/month</span>
              </div>

              <p className="mt-3 text-center text-sm text-muted-foreground">
                <span className="line-through">{REGULAR_PRICE}/month</span> regular price — 50% off,
                locked for life
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

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Every account starts with a 30-day free trial. No credit card to begin.
          </p>
        </div>
      </div>
    </section>
  )
}
