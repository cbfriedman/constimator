import Image from "next/image"
import { Layers, Ruler, Gauge, UserCheck, Globe, Clock, CheckCircle2 } from "lucide-react"
import { TradeSelector } from "@/components/trade-selector"

const reviewOptions = [
  {
    icon: UserCheck,
    label: "Review it yourself",
    highlight: "Included",
    sub: "Free with every takeoff",
    description:
      "Open every marked-up sheet, adjust quantities, and confirm assumptions in your own time. You keep full control of the numbers before they hit your estimate.",
    points: ["Editable quantities by trade", "Sheet-by-sheet markups", "Export to CSV or your estimating tool"],
    featured: false,
  },
  {
    icon: Globe,
    label: "Request a Constimator manual review",
    highlight: "$12 / sheet",
    sub: "3-business-day turnaround",
    description:
      "Hand it to Constimator's trained review team. Every marked-up sheet is checked and corrected by a specialist, then returned with a verified takeoff you can bid from.",
    points: ["Specialist-verified quantities", "Corrections & notes per sheet", "Guaranteed 3-day turnaround"],
    featured: true,
  },
]

export function AiTakeoff() {
  return (
    <section id="takeoff" className="scroll-mt-16 border-t border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">After you decide to bid</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Turn the specs into a full AI takeoff
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
            Once a project is worth chasing, Constimator pulls every bid document from the specs and runs an
            automated takeoff across all trades &mdash; or just the ones you self-perform.
          </p>
        </div>

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <Image
              src="/ai-takeoff-preview.png"
              alt="Constimator AI takeoff showing color-coded quantity markups across trades on a plan sheet with an estimated accuracy gauge"
              width={1200}
              height={900}
              className="h-auto w-full"
            />
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Layers className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold">All trades, or the ones you choose</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Run a complete takeoff or select only the trades you self-perform. Constimator organizes
                  quantities by trade so scopes stay clean.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Ruler className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold">Measured straight from the documents</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Linear, area, and count quantities are read from the plan set and specifications and marked
                  up sheet by sheet for you to verify.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Gauge className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold">A confidence score on every trade</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Each trade comes back with an estimated accuracy so you know where the AI is strong and where
                  a human set of eyes will pay off before you commit to a number.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Try it</p>
            <h3 className="mt-3 font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              Scope a takeoff and price the review
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
              Pick the trades you want covered and watch the sheet count, blended accuracy, and manual-review
              cost update in real time.
            </p>
          </div>
          <div className="mt-8">
            <TradeSelector />
          </div>
        </div>

        <div className="mt-16 text-center">
          <h3 className="font-display text-2xl font-bold tracking-tight text-balance">
            Then verify it your way before you bid
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
            We always recommend a manual review of an AI takeoff. Do it in-house, or let our team handle it.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {reviewOptions.map((option) => (
            <div
              key={option.label}
              className={`relative flex flex-col rounded-xl border p-8 ${
                option.featured ? "border-primary bg-card shadow-sm" : "border-border bg-card"
              }`}
            >
              {option.featured ? (
                <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Recommended
                </span>
              ) : null}
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <option.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h4 className="font-display text-lg font-semibold">{option.label}</h4>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-foreground">{option.highlight}</span>
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {option.sub}
                </span>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{option.description}</p>

              <ul className="mt-5 flex flex-col gap-2.5">
                {option.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
