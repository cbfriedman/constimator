const steps = [
  {
    number: "01",
    title: "Upload your bid documents",
    description:
      "Drop in the plans, specs, addenda, and the official bid form. Constimator handles the full set.",
  },
  {
    number: "02",
    title: "Build your estimate your way",
    description:
      "Keep estimating the way you already do — enter your quantities and pricing. Constimator reads the documents alongside you; you stay in control of your numbers.",
  },
  {
    number: "03",
    title: "Reconcile before you submit",
    description:
      "Constimator checks your estimate against the official bid form and flags anything missing or off — so you fix it before bid day, not after.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">How it works</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Three steps to a bid you&apos;ve double-checked
          </h2>
        </div>

        {/* Solid theme tokens only — no alpha-composited colours here.
            Tailwind emits `background-color: var(--foreground)` as the
            non-color-mix fallback for `bg-foreground/5`, so on a browser
            without color-mix support these cards rendered as solid
            near-black slabs with near-black text on top: the step titles and
            descriptions were invisible. bg-card/text-card-foreground carry no
            alpha and resolve correctly everywhere, in both themes. */}
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative flex flex-col rounded-xl border border-border bg-card p-8 text-card-foreground shadow-sm"
            >
              <span className="font-display text-4xl font-bold leading-none text-primary">
                {step.number}
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold text-balance">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
