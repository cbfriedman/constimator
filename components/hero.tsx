import { ArrowRight, CheckCircle2, FileSearch } from "lucide-react"

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
              Decide <span className="text-primary">bid or no-bid</span> in minutes, not days.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
              Constimator reads the plans and specs for you, pulling the numbers that make or break a
              job — engineer&apos;s estimate, project duration, liquidated damages, bonding, and DBE goals — so
              you know which projects are worth pursuing.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/dashboard"
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
                No credit card required
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                Works with any plan set
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FileSearch className="h-4 w-4 text-primary" aria-hidden="true" />
                Featured on OnlinePlanService.com
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
                  Bid Summary — Hwy 12 Culvert Rehabilitation
                </span>
              </div>
              <img
                src="/bid-analysis-preview.png"
                alt="Constimator bid summary showing engineer's estimate, project duration, liquidated damages, bonding and DBE requirements extracted from the plans, with a bid or no-bid recommendation"
                className="w-full"
                width={1200}
                height={900}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
