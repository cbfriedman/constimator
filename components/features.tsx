import { Calculator, FileText, Ruler, Database, TrendingUp, Users } from "lucide-react"

const features = [
  {
    icon: Ruler,
    title: "Fast digital takeoffs",
    description:
      "Measure plans on screen and push quantities straight into your estimate. No more paper, scale rulers, or double entry.",
  },
  {
    icon: Database,
    title: "Live cost database",
    description:
      "Localized material and labor rates that stay current, so every line item reflects what the job actually costs today.",
  },
  {
    icon: Calculator,
    title: "Smart assemblies",
    description:
      "Reusable cost assemblies bundle materials, labor, and markup so complex scopes come together in a few clicks.",
  },
  {
    icon: FileText,
    title: "Client-ready proposals",
    description:
      "Turn any estimate into a branded, professional proposal your clients can review and approve online.",
  },
  {
    icon: TrendingUp,
    title: "Margin protection",
    description:
      "See profit and margin update in real time as you build the bid, so you never leave money on the table.",
  },
  {
    icon: Users,
    title: "Team collaboration",
    description:
      "Estimators, PMs, and owners work from the same numbers with roles, comments, and full version history.",
  },
]

export function Features() {
  return (
    <section id="features" className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Everything you need</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            One place to price the whole job
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
            From takeoff to signed proposal, Constimator replaces the spreadsheets and guesswork with a
            single, accurate workflow.
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
