import { ArrowRight, CheckCircle2, Star } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="flex h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              Built for contractors, remodelers &amp; builders
            </div>

            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Estimates and bids, <span className="text-primary">done right</span> the first time.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
              Constimator turns takeoffs, labor, and materials into accurate, professional estimates in
              minutes — so you price jobs with confidence and win more work.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
              >
                Start your free trial
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
                14-day free trial
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                No credit card required
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="flex items-center" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </span>
                4.9/5 from 1,200+ pros
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
                  Kitchen Remodel — Estimate #1042
                </span>
              </div>
              <img
                src="/dashboard-preview.png"
                alt="Constimator dashboard showing a detailed construction estimate with line items, cost breakdown, and total project cost"
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
