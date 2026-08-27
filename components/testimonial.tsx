import { Quote } from "lucide-react"

type Testimonial = {
  quote: string
  /** Anonymised is fine. Invented is not — see the note below. */
  name: string
  details: string
  initials: string
}

// ---------------------------------------------------------------------------
// EMPTY ON PURPOSE. This section renders nothing until there is a real quote.
//
// The draft supplied one to ship now:
//
//   "Caught a $340K omission on a $4M Caltrans job. Bid came in second by $8K —
//    would have been $332K low without Constimator."
//    — Civil Contractor, Northern California, 12 employees
//
// Two problems with shipping it as-is:
//
// 1. There is no such customer yet. <Pricing /> is still recruiting the first
//    20 founding members and the footer says "Early access". Anonymising a real
//    testimonial is normal; writing one is a fabricated review, and it is the
//    kind of thing that ends up in a screenshot next to the word "fake".
//
// 2. The story runs backwards. If the omission was caught and the bid still
//    came second by $8K, then without Constimator the bid would have been $332K
//    BELOW the winner — they would have won it, with a $340K hole in the price.
//    That is a great story, but it is the winner's-curse story ("we would have
//    won it and lost our shirt"), not the "we lost a job we should have won"
//    story the headline on this page sets up. Told the way it is written, a
//    contractor reads it as Constimator costing them the job.
//
// When a founding member gives you a real one, add it here and the section
// appears. Anonymised attribution is fine — get their sign-off on the wording.
const testimonials: Testimonial[] = []

export function Testimonial() {
  if (testimonials.length === 0) return null

  return (
    <section className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="flex flex-col gap-8">
          {testimonials.map((testimonial) => (
            <figure
              key={testimonial.quote}
              className="rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10"
            >
              <Quote className="h-8 w-8 text-primary" aria-hidden="true" />

              <blockquote className="mt-5 font-display text-xl leading-relaxed text-balance sm:text-2xl">
                {testimonial.quote}
              </blockquote>

              <figcaption className="mt-7 flex items-center gap-4 border-t border-border pt-6">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-accent-foreground"
                  aria-hidden="true"
                >
                  {testimonial.initials}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">{testimonial.name}</span>
                  <span className="text-sm text-muted-foreground">{testimonial.details}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
