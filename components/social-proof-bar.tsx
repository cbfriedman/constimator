import { HardHat } from "lucide-react"

// ---------------------------------------------------------------------------
// HONESTY NOTE — read before editing.
//
// The draft for this bar said "Trusted by contractors bidding on: Caltrans,
// SFMTA, LACMTA, SANDAG" and "Used on $400M+ in public works bids". Neither is
// true yet: the footer says "Early access", <Proof /> says "early prototype",
// and <Pricing /> is still recruiting the first 20 founding members. Publishing
// borrowed logos as customer proof is the one claim a contractor can trivially
// disprove by asking any of those agencies, and it would poison every other
// (true) claim on the page.
//
// So the bar keeps the visual shape but makes a claim we can actually defend:
// these are the bid-form formats Constimator is built to read. That's grounded
// — the sample project is a Shasta County job and the spec references in
// lib/reconciliation-data.ts (39-1, 71-2, 73-2) are Caltrans standard spec
// sections.
//
// WHEN THE PILOT LANDS: swap `agencies` for the agencies your founding members
// actually bid, change `label` back to "Trusted by contractors bidding on:",
// and set `volumeStat` to a number you can source from real projects.
// ---------------------------------------------------------------------------

const label = "Built to read the bid forms you actually see:"

const agencies = [
  "Caltrans",
  "California counties",
  "City & municipal",
  "Federal-aid",
]

const volumeStat = "Built by a former public works contractor"

export function SocialProofBar() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex flex-col items-center gap-x-3 gap-y-2 sm:flex-row sm:flex-wrap sm:justify-center">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <ul className="flex flex-wrap items-center justify-center gap-2">
          {agencies.map((agency) => (
            <li
              key={agency}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground"
            >
              {agency}
            </li>
          ))}
        </ul>
      </div>

      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <HardHat className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        {volumeStat}
      </p>
    </div>
  )
}
