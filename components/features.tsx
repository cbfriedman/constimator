import { Calendar, AlertTriangle, DollarSign, ShieldCheck, Users, Gavel } from "lucide-react"

const features = [
  {
    icon: DollarSign,
    title: "Engineer's estimate",
    description:
      "See the agency's estimated construction cost up front, so you can gauge project size and whether it fits your book of work.",
  },
  {
    icon: Calendar,
    title: "Project duration",
    description:
      "Pull working-day and calendar-day requirements automatically to check them against your crew's availability.",
  },
  {
    icon: AlertTriangle,
    title: "Liquidated damages",
    description:
      "Surface the daily penalty for late completion instantly, so schedule risk is priced in before you commit.",
  },
  {
    icon: ShieldCheck,
    title: "Bonding requirements",
    description:
      "Identify bid, performance, and payment bond thresholds to confirm the job is within your bonding capacity.",
  },
  {
    icon: Users,
    title: "DBE / goal requirements",
    description:
      "Extract disadvantaged business enterprise goals and participation requirements before they become a surprise.",
  },
  {
    icon: Gavel,
    title: "Bid details & deadlines",
    description:
      "Capture bid due dates, prevailing wage, and submission requirements so nothing critical slips through the cracks.",
  },
]

export function Features() {
  return (
    <section id="features" className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">What we extract</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            The numbers that decide the bid
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
            Constimator scans the plans and specifications and pulls the parameters public works
            contractors need to make a fast, informed go / no-go call.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
