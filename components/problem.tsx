export function Problem() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-28">
        <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          One missed item can lose a job you should have won.
        </h2>

        <p className="mt-6 text-lg leading-relaxed text-muted-foreground text-pretty">
          Public works is won by fractions of a percent. A bid item you priced as incidental, a
          quantity that doesn&apos;t match the bid form, a unit you read wrong — any one of them
          can make your bid non-responsive or blow your margin.
        </p>

        <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">
          And it&apos;s all buried in hundreds of pages of specs and a bid form you&apos;re
          reconciling by hand, under deadline.
        </p>

        {/* $124,700 is not a made-up industry average. It is 2,150 LF x $58.00,
            the exact value of the one bid item missing from the sample estimate
            on this page — see lib/estimate-data.ts and the annotation in
            <ReconciliationShowcase />. If that sample data changes, change this. */}
        <div className="mx-auto mt-12 max-w-md rounded-2xl border border-l-4 border-border border-l-destructive bg-card p-8 text-left shadow-sm">
          <p className="font-display text-5xl font-bold tabular-nums text-destructive">$124,700</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The single bid item left out of the estimate in the sample project below — 6.7% of a
            $1.85M job, and enough to make the bid non-responsive on its own.
          </p>
        </div>

        <p className="mt-12 font-display text-xl font-semibold text-foreground text-balance">
          Constimator does that reconciliation for you.
        </p>
      </div>
    </section>
  )
}
