const steps = [
  {
    number: "01",
    title: "Import the plans",
    description:
      "Upload drawings or PDFs and mark up your takeoff on screen. Quantities flow directly into the estimate.",
  },
  {
    number: "02",
    title: "Build the estimate",
    description:
      "Drop in assemblies, apply live material and labor rates, and set your markup. Watch the total and margin update instantly.",
  },
  {
    number: "03",
    title: "Send the proposal",
    description:
      "Generate a branded proposal, share it online, and let clients review and approve — then push it straight to a job.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">How it works</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            From plans to signed bid in three steps
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-secondary-foreground/70 text-pretty">
            A workflow designed around how estimators actually work in the field and the office.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="relative rounded-xl border border-white/10 bg-white/5 p-8">
              <span className="font-display text-4xl font-bold text-primary">{step.number}</span>
              <h3 className="mt-4 font-display text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-secondary-foreground/70">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
