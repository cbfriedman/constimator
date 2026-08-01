import { GitCompare, Puzzle } from "lucide-react"

export function WhyDifferent() {
  return (
    <section className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-28">
        <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Not another takeoff tool
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground text-pretty">
          Most AI estimating tools race to measure quantities off drawings. Constimator does
          something different: it makes sure the estimate you already built matches the official
          bid form the owner will judge it against. It works alongside your current estimating
          setup — no rip-and-replace, no learning curve during bid season. Just a final check that
          catches what costs contractors jobs.
        </p>

        <div className="mt-10 flex flex-col justify-center gap-6 sm:flex-row">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Puzzle className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium text-foreground">
              Works alongside your current estimating tool
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <GitCompare className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium text-foreground">
              Checks your numbers, doesn&apos;t replace them
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
