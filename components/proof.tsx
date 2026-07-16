import { Quote } from "lucide-react"

const stats = [
  { value: "3x", label: "Faster estimate turnaround" },
  { value: "27%", label: "Higher bid win rate" },
  { value: "$1.4M", label: "Avg. annual work won per team" },
  { value: "5,000+", label: "Construction teams" },
]

export function Proof() {
  return (
    <section id="customers" className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="font-display text-4xl font-bold text-primary">{stat.value}</div>
              <div className="mt-2 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        <figure className="mx-auto mt-14 max-w-3xl rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
          <Quote className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
          <blockquote className="mt-6 font-display text-xl font-medium leading-relaxed text-balance sm:text-2xl">
            &ldquo;We used to spend two days on a big estimate. With Constimator it&apos;s a couple of
            hours, and the numbers are tighter than they&apos;ve ever been. It paid for itself on the first
            bid we won.&rdquo;
          </blockquote>
          <figcaption className="mt-6 flex items-center justify-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-accent-foreground">
              DM
            </span>
            <span className="text-left">
              <span className="block text-sm font-semibold">Dana Marsh</span>
              <span className="block text-sm text-muted-foreground">Owner, Summit Builders</span>
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
