import { Check } from "lucide-react"

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
      </div>
    </section>
  )
}
