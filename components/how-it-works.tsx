const steps = [
  {
    number: "01",
    title: "Upload the plans & specs",
    description:
      "Pull a project straight from OnlinePlanService.com or drop in the bid documents. Constimator handles the full plan set and specifications.",
  },
  {
    number: "02",
    title: "We extract the key parameters",
    description:
      "Engineer's estimate, project duration, liquidated damages, bonding, DBE goals, and bid deadlines are read from the documents and organized into one summary.",
  },
  {
    number: "03",
    title: "Make the bid / no-bid call",
    description:
      "Review the summary against your capacity and appetite, then decide with confidence which projects deserve a full estimate.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">How it works</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            From plan set to decision in three steps
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-secondary-foreground/70 text-pretty">
            Stop reading hundreds of pages just to learn a project isn&apos;t worth chasing. Constimator does
            the first pass for you.
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
