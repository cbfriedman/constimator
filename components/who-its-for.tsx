import { Building2, Landmark, TrafficCone } from "lucide-react"

const projectTypes = [
  {
    icon: TrafficCone,
    title: "State DOT projects",
    description:
      "Caltrans and equivalent state work — standard spec sections, addenda, and the official bid form they publish with them.",
  },
  {
    icon: Building2,
    title: "County and municipal work",
    description:
      "County road jobs, city street and utility work, and the smaller bid forms that still disqualify you for a missing line.",
  },
  {
    icon: Landmark,
    title: "Federal-aid infrastructure",
    description:
      "Federally funded projects with the extra requirements — prevailing wage, DBE goals, and the paperwork that rides along.",
  },
]

export function WhoItsFor() {
  return (
    <section id="who-its-for" className="scroll-mt-16 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Who it&apos;s for</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Built for public works contractors
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">
            Constimator is designed specifically for contractors bidding on:
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {projectTypes.map((type) => {
            const Icon = type.icon

            return (
              <div
                key={type.title}
                className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-balance">
                  {type.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {type.description}
                </p>
              </div>
            )
          })}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-lg leading-relaxed text-muted-foreground text-pretty">
          Works alongside HeavyBid, HCSS, Excel, or whatever you already estimate in. No
          rip-and-replace, no learning curve during bid season.
        </p>
      </div>
    </section>
  )
}
