const companies = [
  "Summit Builders",
  "Ironwood Co.",
  "BlueLine Contracting",
  "Cornerstone Homes",
  "Vanguard Remodel",
  "Northgate Construction",
]

export function TrustedBy() {
  return (
    <section className="border-y border-border bg-muted/50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Trusted by 5,000+ construction teams
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {companies.map((name) => (
            <span
              key={name}
              className="font-display text-base font-semibold tracking-tight text-muted-foreground/70"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
