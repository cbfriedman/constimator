import {
  ArrowRight,
  BarChart3,
  FileText,
  HardHat,
  Play,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  TriangleAlert,
  Zap,
} from "lucide-react"

// Hero, rebuilt Sep 2026 to the visual design (dark navy, orange primary,
// edge-lit panels, a handwritten accent line, four feature tiles, a benefits
// row). What this deliberately does NOT carry over from the mockup:
//
//   * "2,500+ projects analyzed", "$150M+ in bids reviewed", "98% accuracy",
//     "4.9/5 customer rating". None of those is true. docs/DECISIONS.md says
//     the product has no paying customers yet, <Pricing /> is still
//     recruiting founding members, and commit e4def9d already removed claims
//     the app couldn't back up. Publishing invented social proof is the one
//     thing a contractor can disprove in a phone call, and it would poison
//     every true claim on the page. The trust strip below keeps the visual
//     slot and fills it with things that are actually true. When there are
//     real numbers, this is where they go.
//   * "Watch demo". There is no video. The button goes to the sample project
//     walkthrough (/demo-guide) and says so.
//   * The sunset-and-excavator photograph. No licensed asset; the glow
//     gradient stands in for it.
//
// The former <SocialProofBar /> (Caltrans / county / municipal / federal-aid
// format chips) is folded into the trust strip as one line rather than a
// separate bar, which is where the design puts it.

const featureTiles = [
  {
    icon: FileText,
    title: "Upload Bid Docs",
    subtitle: "PDF plans, specs, bid form",
    tone: "text-review bg-review/15",
  },
  {
    icon: Search,
    title: "AI Analysis",
    subtitle: "Line-by-line check",
    tone: "text-glow bg-glow/15",
  },
  {
    icon: TriangleAlert,
    title: "Find Missing Items",
    subtitle: "Catch costly errors",
    tone: "text-primary bg-primary/15",
  },
  {
    icon: BarChart3,
    title: "Win More Bids",
    subtitle: "Bid complete, bid confident",
    tone: "text-success bg-success/15",
  },
] as const

const benefits = [
  { icon: Zap, title: "Save Time", subtitle: "Automate the review process" },
  { icon: ShieldCheck, title: "Reduce Risk", subtitle: "Catch errors early" },
  { icon: Target, title: "Win More Projects", subtitle: "Bid with confidence" },
  {
    icon: TrendingUp,
    title: "Data-Driven Decisions",
    subtitle: "Turn information into profit",
  },
] as const

// Only claims we can defend today. See the note at the top of the file.
const trustLine = [
  "Built by a former public works contractor",
  "Reads Caltrans, county, municipal and federal-aid bid forms",
  "30-day free trial — no credit card",
] as const

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Backdrop: the design's warm horizon glow under a cool top wash. Pure
          CSS so nothing needs licensing, and it stays cheap on mobile. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute inset-x-0 top-0 h-[60%] bg-radial-[70%_60%_at_50%_0%] from-glow/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[55%] bg-radial-[60%_70%_at_50%_100%] from-primary/25 to-transparent" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="grid items-start gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Copy column */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <HardHat className="h-3.5 w-3.5" aria-hidden="true" />
              Built for public works contractors
            </span>

            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.02] tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Turn complex bid documents into{" "}
              <span className="text-primary">winning results.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
              Constimator reconciles your estimate against the official bid form,
              line by line — catching missing items, quantity busts, and unit
              mismatches before you bid.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/sign-up"
                className="glow-primary inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                Try it free for 30 days
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="/demo-guide"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card/60 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:bg-muted"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                See the sample project
              </a>
            </div>

            {/* TRIAL_DAYS in lib/billing.ts is the source of truth for "30
                days"; if that constant changes, this line changes. */}
            <p className="mt-5 text-sm text-muted-foreground">
              No credit card required · 30 days free · Built by a former public
              works contractor
            </p>
          </div>

          {/* Accent column */}
          <div className="relative hidden lg:block">
            <p className="font-script -rotate-6 text-5xl font-bold leading-none text-foreground">
              Less Risk.
              <br />
              <span className="pl-10">More Wins.</span>
            </p>
            <svg
              aria-hidden="true"
              viewBox="0 0 220 24"
              className="mt-2 ml-8 h-6 w-56 text-primary"
              fill="none"
            >
              <path
                d="M4 16 C 60 4, 140 4, 216 12"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>

            <div className="glow-panel mt-10 flex items-center gap-3 rounded-2xl bg-card/80 px-5 py-4 backdrop-blur">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-glow/15 text-glow">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="text-base font-semibold leading-tight">
                Catch Missing Items
                <br />
                Before You Bid
              </p>
            </div>
          </div>
        </div>

        {/* Feature tiles */}
        <ul className="mt-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {featureTiles.map((tile) => {
            const Icon = tile.icon
            return (
              <li
                key={tile.title}
                className="glow-panel flex flex-col items-center gap-3 rounded-2xl bg-card/70 px-4 py-6 text-center backdrop-blur"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${tile.tone}`}
                >
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="font-display text-base font-semibold">{tile.title}</p>
                <p className="text-xs text-muted-foreground">{tile.subtitle}</p>
              </li>
            )
          })}
        </ul>

        {/* Trust strip — true statements only. The mockup's four invented
            metrics are intentionally absent; see the file header. */}
        <div className="mt-10 rounded-2xl border border-border bg-card/40 px-6 py-5">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Trusted by contractors who build America&apos;s infrastructure —
            starting with the founding members
          </p>
          <ul className="mt-4 flex flex-col items-center justify-center gap-x-8 gap-y-2 text-sm text-foreground sm:flex-row sm:flex-wrap">
            {trustLine.map((line) => (
              <li key={line} className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                />
                {line}
              </li>
            ))}
          </ul>
        </div>

        {/* Benefits row */}
        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit) => {
            const Icon = benefit.icon
            return (
              <li key={benefit.title} className="flex items-center gap-4">
                <span className="glow-panel flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display text-base font-semibold">
                    {benefit.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{benefit.subtitle}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
