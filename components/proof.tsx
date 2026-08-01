import Link from "next/link"
import { ArrowRight, Info } from "lucide-react"

const intelSummary = [
  { label: "Engineer's estimate", value: "$1,850,000" },
  { label: "Working days", value: "60" },
  { label: "Liquidated damages", value: "$2,500/day" },
  { label: "Prevailing wage", value: "Required" },
]

const reconSummary = [
  { item: "HMA Type A", status: "Match", color: "bg-success/10 text-success" },
  { item: "18\" RCP Class III", status: "Quantity discrepancy", color: "bg-warning/15 text-warning" },
  { item: "Minor Concrete (Curb & Gutter)", status: "Missing from estimate", color: "bg-destructive/10 text-destructive" },
]

export function Proof() {
  return (
    <section id="results" className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Sample project</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            See it on a real project
          </h2>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-1.5 border-b border-border bg-muted px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-border" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-border" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-border" aria-hidden="true" />
              <span className="ml-3 text-xs font-medium text-muted-foreground">
                Project Intelligence — Shasta County Roadway Improvements
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-6 p-6">
              {intelSummary.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                  <dd className="mt-1 font-display text-lg font-semibold">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-1.5 border-b border-border bg-muted px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-border" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-border" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-border" aria-hidden="true" />
              <span className="ml-3 text-xs font-medium text-muted-foreground">
                Reconciliation — Shasta County Roadway Improvements
              </span>
            </div>
            <ul className="flex flex-col gap-1 p-3">
              {reconSummary.map((row) => (
                <li
                  key={row.item}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm"
                >
                  <span className="font-medium">{row.item}</span>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${row.color}`}
                  >
                    {row.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-8 flex max-w-2xl flex-col items-center gap-6 text-center">
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Sample project shown for demonstration. Constimator is an early prototype built by a
            former public works contractor.
          </p>
          <Link
            href="/demo-guide"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Explore the sample project
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
