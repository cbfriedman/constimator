import { ArrowRight } from "lucide-react"

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-16 bg-muted/50">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Pricing</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Founding members
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">
            We&apos;re bringing on a small group of founding contractors to shape Constimator and
            lock in founding pricing as we grow. Early members get direct input on the product and
            preferred rates.
          </p>
          <a
            href="mailto:coby@cfcontracting.com?subject=Constimator Founding Access"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
          >
            Request founding access
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  )
}
