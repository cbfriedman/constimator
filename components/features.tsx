import { FileText, ListChecks, Scale, FileOutput, CheckCircle2 } from "lucide-react"

const flags = [
  "Missing bid items",
  "Quantity discrepancies",
  "Unit mismatches",
  "Low-confidence items that need a human look",
]

export function Features() {
  return (
    <section id="what-it-does" className="scroll-mt-16 bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            What it does
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            From bid documents to a bid you can trust
          </h2>
        </div>

        <div className="mt-14 flex flex-col gap-6">
          <div className="flex gap-4 rounded-xl border border-border bg-card p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-display text-lg font-semibold">Reads your bid documents</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Upload the plans, specs, addenda, and official bid form. Constimator reads them
                and pulls out what matters — project summary, scope items, schedules, and
                requirements — so you&apos;re not hunting through hundreds of pages.
              </p>
            </div>
          </div>

          <div className="flex gap-4 rounded-xl border border-border bg-card p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <ListChecks className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-display text-lg font-semibold">Extracts the bid requirements</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Engineer&apos;s estimate, working days, liquidated damages, bonding, prevailing
                wage, DBE goals, and bid deadlines — surfaced in one summary, each tied back to
                the page it came from.
              </p>
            </div>
          </div>

          <div
            id="reconciliation"
            className="scroll-mt-24 rounded-2xl border border-primary bg-card p-8 shadow-sm"
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Scale className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-xl font-semibold">
                    Reconciles against the official bid form
                  </h3>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    The differentiator
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  This is what nothing else does. Constimator compares your estimate against the
                  official bid form, line by line — official quantity vs. what it read in the
                  plans vs. what&apos;s in your estimate — and flags every mismatch:
                </p>
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {flags.map((flag) => (
                    <li key={flag} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-4 rounded-xl border border-border bg-card p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <FileOutput className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-display text-lg font-semibold">Exports clean reports</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Estimate summary and a full reconciliation report, in PDF or Excel, with every
                number&apos;s source clearly marked — official, AI-extracted, or your own entry.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
