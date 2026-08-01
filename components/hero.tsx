import { ArrowRight, CheckCircle2 } from "lucide-react"

const reconRows = [
  {
    item: "HMA Type A",
    unit: "TON",
    official: "4,850",
    ai: "4,850",
    estimate: "4,850",
    status: "Match",
    color: "border-transparent bg-success/10 text-success",
  },
  {
    item: "18\" RCP Class III",
    unit: "LF",
    official: "640",
    ai: "655",
    estimate: "655",
    status: "Qty diff",
    color: "border-transparent bg-warning/15 text-warning",
  },
  {
    item: "Cold Plane AC (2\")",
    unit: "SY",
    official: "12,300",
    ai: "12,300",
    estimate: "12,300",
    status: "Unit conv.",
    color: "border-transparent bg-caution/15 text-caution",
  },
  {
    item: "Minor Concrete",
    unit: "LF",
    official: "2,150",
    ai: "2,150",
    estimate: "—",
    status: "Missing",
    color: "border-transparent bg-destructive/10 text-destructive",
  },
]

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="flex h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              Built for public works contractors
            </div>

            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Never submit a <span className="text-primary">non-responsive bid</span> again.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
              Constimator reads your plans, specs, addenda, and the official bid form — then
              reconciles your estimate against that bid form, so missing items, quantity busts, and
              unit mismatches get caught before bid day, not after you&apos;ve lost the job.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
              >
                Analyze your first project
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                See how it works
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                Works with any plan set
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                Keep using your current estimating tool
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                Your numbers stay yours
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-primary/10 blur-2xl" aria-hidden="true" />
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-foreground/10">
              <div className="flex items-center gap-1.5 border-b border-border bg-muted px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-border" aria-hidden="true" />
                <span className="h-3 w-3 rounded-full bg-border" aria-hidden="true" />
                <span className="h-3 w-3 rounded-full bg-border" aria-hidden="true" />
                <span className="ml-3 text-xs font-medium text-muted-foreground">
                  Shasta County Roadway Improvements — Bid Form Reconciliation
                </span>
              </div>
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                    <th className="px-3 py-2.5 font-medium">Item</th>
                    <th className="px-2 py-2.5 text-right font-medium">Official</th>
                    <th className="px-2 py-2.5 text-right font-medium">AI</th>
                    <th className="px-2 py-2.5 text-right font-medium">Est.</th>
                    <th className="px-2 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reconRows.map((row) => (
                    <tr key={row.item} className="border-b border-border last:border-0">
                      <td className="px-3 py-3 font-medium">
                        {row.item}
                        <span className="ml-1 text-muted-foreground">{row.unit}</span>
                      </td>
                      <td className="px-2 py-3 text-right tabular-nums text-muted-foreground">{row.official}</td>
                      <td className="px-2 py-3 text-right tabular-nums text-muted-foreground">{row.ai}</td>
                      <td className="px-2 py-3 text-right tabular-nums text-muted-foreground">{row.estimate}</td>
                      <td className="px-2 py-3">
                        <span
                          className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${row.color}`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
