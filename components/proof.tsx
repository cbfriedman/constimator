import { Quote } from "lucide-react"

const stats = [
  { value: "Minutes", label: "To review a project, not days" },
  { value: "6+", label: "Key bid parameters extracted" },
  { value: "100s", label: "Of spec pages scanned per project" },
  { value: "Every bid", label: "Assessed before you commit crews" },
]

export function Proof() {
  return (
    <section id="results" className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="font-display text-3xl font-bold text-primary sm:text-4xl">{stat.value}</div>
              <div className="mt-2 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        <figure className="mx-auto mt-14 max-w-3xl rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
          <Quote className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
          <blockquote className="mt-6 font-display text-xl font-medium leading-relaxed text-balance sm:text-2xl">
            &ldquo;We were spending half a day just digging liquidated damages and DBE goals out of the
            specs. Constimator hands us that in minutes, so we only chase the jobs we should actually be
            bidding.&rdquo;
          </blockquote>
          <figcaption className="mt-6 flex items-center justify-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-accent-foreground">
              RT
            </span>
            <span className="text-left">
              <span className="block text-sm font-semibold">Ray Torres</span>
              <span className="block text-sm text-muted-foreground">Chief Estimator, Meridian Public Works</span>
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
