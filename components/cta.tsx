import { ArrowRight } from "lucide-react"

export function Cta() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="rounded-3xl bg-secondary px-6 py-16 text-center text-secondary-foreground sm:px-12">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Chase the right jobs. Bid them without the busts.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-secondary-foreground/70 text-pretty">
            Let Constimator read the documents and reconcile your estimate against the official
            bid form — so your bid is complete, responsive, and right, before you submit it.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
            >
              Analyze your first project
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href="mailto:coby@cfcontracting.com?subject=Constimator demo"
              className="inline-flex items-center justify-center rounded-md border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-white/10"
            >
              Book a demo
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
