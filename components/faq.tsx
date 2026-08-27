import { Plus } from "lucide-react"

// Native <details>/<summary> rather than a JS accordion: this stays a server
// component with zero client bundle, and the answers are still in the DOM for
// search engines and for anyone who hits Ctrl-F looking for "HeavyBid".
//
// The first entry is the old <WhyDifferent /> section ("Not another takeoff
// tool"). It was a full-width section above the fold; it is a good answer to a
// question nobody had asked yet, which is exactly what an FAQ is for.
const faqs = [
  {
    question: "Isn't this just another AI takeoff tool?",
    answer:
      "No. Most AI estimating tools race to measure quantities off drawings. Constimator does something different: it makes sure the estimate you already built matches the official bid form the owner will judge it against. It checks your numbers, it doesn't replace them.",
  },
  {
    question: "Do I have to stop using HeavyBid, HCSS, or Excel?",
    answer:
      "No. Keep estimating exactly the way you do now. Constimator reads the bid documents alongside you and reconciles what you built against the official bid form. No rip-and-replace, and no learning curve during bid season.",
  },
  {
    question: "What documents does it need?",
    answer:
      "The plans, the specs, the addenda, and the official bid form. Constimator handles the full set and ties what it reads back to the page it came from, so you can check any number against its source.",
  },
  {
    question: "Does it work with any plan set?",
    answer:
      "Yes. Constimator reads standard public works plan sets, specifications, and bid forms as published — state DOT, county, municipal, and federal-aid. You upload what the agency posted; there's no special format to prepare.",
  },
  {
    question: "What exactly does it flag?",
    answer:
      "Bid items on the official form that are missing from your estimate, quantities that disagree between the plans and the bid form, units that don't match between the two, and items the AI read with low confidence and wants a human to look at.",
  },
  {
    question: "Do my numbers stay mine?",
    answer:
      "Yes. Your estimates, documents, and pricing live in your own organization's data and are not shared with other contractors or used to train anything. Every number in a report is marked with its source — official, AI-extracted, or your own entry.",
  },
  {
    question: "How far along is Constimator?",
    answer:
      "It's early. Accounts, document processing, estimating, reconciliation, and exports are all real and working on your own data — but this is an early-stage product built by a former public works contractor and still being validated with its first contractors. That's what the founding member program is for.",
  },
]

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 border-t border-border bg-muted/40">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">FAQ</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Questions contractors ask
          </h2>
        </div>

        <div className="mt-12 flex flex-col gap-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-xl border border-border bg-card px-6 shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-display text-base font-semibold text-foreground marker:content-none">
                {faq.question}
                <Plus
                  className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-45"
                  aria-hidden="true"
                />
              </summary>
              <p className="border-t border-border py-5 text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
