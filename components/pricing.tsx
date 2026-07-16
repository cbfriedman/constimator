import { Check, Globe, Clock } from "lucide-react"

const plans = [
  {
    name: "Bidder",
    price: "$99",
    period: "/mo",
    description: "For independent contractors evaluating a steady flow of projects.",
    features: [
      "Up to 10 projects / month",
      "Full parameter extraction",
      "Bid / no-bid summaries",
      "PDF & plan set uploads",
      "Email support",
    ],
    cta: "Get started",
    featured: false,
  },
  {
    name: "Contractor",
    price: "$299",
    period: "/mo",
    description: "For estimating teams chasing public works across agencies.",
    features: [
      "Up to 50 projects / month",
      "Everything in Bidder",
      "OnlinePlanService sync",
      "Team seats & sharing",
      "Bid calendar & deadlines",
      "Priority support",
    ],
    cta: "Get started",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For established firms with high bid volume.",
    features: [
      "Unlimited projects",
      "Everything in Contractor",
      "Custom extraction rules",
      "API & integrations",
      "SSO & audit logs",
      "Dedicated manager",
    ],
    cta: "Talk to sales",
    featured: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-16 bg-muted/50">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Pricing</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Priced by the projects you evaluate
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
            Start free, then choose a plan that matches your bid volume. No credit card required to start.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                plan.featured
                  ? "border-primary bg-card shadow-xl shadow-primary/10"
                  : "border-border bg-card"
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#"
                className={`mt-8 inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5 ${
                  plan.featured
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Manual review add-on */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Globe className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-semibold">Manual review add-on</h3>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    Available on every plan
                  </span>
                </div>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Have Constimator&apos;s specialist team verify any AI takeoff, sheet by sheet, before you
                  bid. Pay only for the sheets you send &mdash; no subscription required.
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Guaranteed 3-business-day turnaround
                </p>
              </div>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <div className="flex items-baseline gap-1 sm:justify-end">
                <span className="font-display text-3xl font-bold">$12</span>
                <span className="text-sm text-muted-foreground">/ sheet</span>
              </div>
              <a
                href="#takeoff"
                className="mt-3 inline-flex items-center justify-center rounded-md border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                See how it works
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
