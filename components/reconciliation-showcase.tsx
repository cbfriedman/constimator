import { AlertTriangle, ArrowLeftRight, Check, XCircle } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { reconciliationRows, statusColorClasses } from "@/lib/reconciliation-data"
import { cn } from "@/lib/utils"

// The visual centerpiece of the homepage: the reconciliation table, blown up
// and annotated so a contractor gets the point in one glance.
//
// Rows are pulled straight out of lib/reconciliation-data.ts by id rather than
// re-typed here. The old hero teaser duplicated the numbers by hand and had
// already drifted — it showed 18" RCP as official 655 / estimate 640, which is
// backwards from the real row (official 640 / estimate 655). Importing means
// the marketing page and the product can't disagree.
const showcaseRowIds = [6, 7, 8, 15]
const showcaseRows = showcaseRowIds
  .map((id) => reconciliationRows.find((row) => row.id === id))
  .filter((row): row is NonNullable<typeof row> => row !== undefined)

type Annotation = {
  rowId: number
  tone: "save" | "warning" | "error"
  icon: LucideIcon
  kicker: string
  headline: string
  body: string
  /** Dollar impact, derived from the sample estimate — see comment below. */
  impact?: string
  impactLabel?: string
}

// Every number below is arithmetic on the sample project, not a marketing
// estimate. Unit prices come from lib/estimate-data.ts:
//   Minor Concrete (Curb & Gutter)  2,150 LF x $58.00/LF = $124,700
//   18" RCP Class III                  15 LF x $148.00/LF =   $2,220
//   Cold Plane AC (2")             12,300 SY x 9          = 110,700 SF
const annotations: Annotation[] = [
  {
    rowId: 15,
    tone: "error",
    icon: XCircle,
    kicker: "Missing bid item",
    headline: "Minor Concrete is on the bid form and nowhere in your estimate.",
    body:
      "2,150 LF of curb and gutter the owner will judge your bid against. Leave it out and you are either non-responsive or you eat the scope at your own cost.",
    impact: "$124,700",
    impactLabel: "2,150 LF x $58.00 — 6.7% of a $1.85M job",
  },
  {
    rowId: 8,
    tone: "warning",
    icon: AlertTriangle,
    kicker: "Quantity discrepancy",
    headline: "Your plan takeoff and the bid form disagree by 15 LF.",
    body:
      "The plan profile totals 655 LF including inlet connections; the bid form lists 640 LF. You bid the bid form quantity — but you build the plan quantity.",
    impact: "$2,220",
    impactLabel: "15 LF x $148.00 of pipe you install unpaid",
  },
  {
    rowId: 7,
    tone: "save",
    icon: ArrowLeftRight,
    kicker: "Caught before it bit",
    headline: "The plans said SF. The bid form said SY.",
    body:
      "110,700 SF and 12,300 SY are the same quantity — but carry 12,300 against an SF bid item and you have underbid it nine to one. Constimator converted and matched it, so nobody had to catch it at 1:45 on bid day.",
  },
]

const toneStyles: Record<Annotation["tone"], { border: string; icon: string; impact: string }> = {
  save: { border: "border-l-primary", icon: "text-primary", impact: "text-primary" },
  warning: { border: "border-l-warning", icon: "text-warning", impact: "text-warning" },
  error: { border: "border-l-destructive", icon: "text-destructive", impact: "text-destructive" },
}

// Rows the annotations point at get a tint so the eye lands on them first.
// Everything else stays on the card's own solid background.
const rowHighlight: Record<number, string> = {
  15: "bg-destructive/5",
  8: "bg-warning/5",
  7: "bg-caution/5",
}

export function ReconciliationShowcase() {
  return (
    <section id="reconciliation" className="scroll-mt-16 border-y border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Bid form reconciliation
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            See every mismatch before you submit
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">
            Every official bid item, against every line of your estimate. Here is the sample
            project, exactly as Constimator reports it.
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-1.5 border-b border-border bg-muted px-4 py-3 sm:px-6">
            <span className="h-3 w-3 rounded-full bg-border" aria-hidden="true" />
            <span className="h-3 w-3 rounded-full bg-border" aria-hidden="true" />
            <span className="h-3 w-3 rounded-full bg-border" aria-hidden="true" />
            <span className="ml-3 truncate text-xs font-medium text-muted-foreground sm:text-sm">
              Shasta County Roadway Improvements — Bid Form Reconciliation
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] border-collapse text-left">
              <caption className="sr-only">
                Four bid items from the Shasta County sample project, comparing the official bid
                form quantity against the quantity in the estimate.
              </caption>
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-semibold sm:px-6">
                    Bid item
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    Official
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    Your estimate
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold sm:px-6">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm sm:text-base">
                {showcaseRows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn("border-b border-border last:border-0", rowHighlight[row.id])}
                  >
                    <th
                      scope="row"
                      className="px-4 py-4 text-left font-semibold text-foreground sm:px-6"
                    >
                      {row.description}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {row.unit}
                      </span>
                    </th>
                    <td className="px-3 py-4 text-right font-semibold tabular-nums text-foreground">
                      {row.officialQty}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-4 text-right font-semibold tabular-nums",
                        row.estimateQty === "—" ? "text-destructive" : "text-foreground",
                      )}
                    >
                      {row.estimateQty}
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <span
                        className={cn(
                          "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold",
                          statusColorClasses[row.statusColor],
                        )}
                      >
                        {row.statusColor === "green" && (
                          <Check className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {row.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 border-t border-border bg-muted/30 p-4 sm:p-6 lg:grid-cols-3">
            {annotations.map((annotation) => {
              const tone = toneStyles[annotation.tone]
              const Icon = annotation.icon

              return (
                <div
                  key={annotation.rowId}
                  className={cn(
                    "flex flex-col rounded-lg border border-l-4 border-border bg-card p-5",
                    tone.border,
                  )}
                >
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <Icon className={cn("h-4 w-4 shrink-0", tone.icon)} aria-hidden="true" />
                    <span className={tone.icon}>{annotation.kicker}</span>
                  </p>

                  <h3 className="mt-3 font-display text-base font-semibold leading-snug text-balance">
                    {annotation.headline}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {annotation.body}
                  </p>

                  {annotation.impact && (
                    <div className="mt-4 border-t border-border pt-4">
                      <p className={cn("font-display text-2xl font-bold tabular-nums", tone.impact)}>
                        {annotation.impact}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {annotation.impactLabel}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-muted-foreground">
          Sample project shown for demonstration. The quantities, unit prices, and dollar impacts
          above are the real numbers from that sample estimate, not illustrations.
        </p>
      </div>
    </section>
  )
}
