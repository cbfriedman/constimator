import { ShieldAlert } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

/**
 * Risks & RFIs. Not a real extraction feature, so the tab says so.
 *
 * This file used to also contain RfiSuggestionsPanel — hand-drafted RFI
 * suggestions from lib/rfi-suggestions-data.ts, rendered when
 * `project.number === demoProject.number`. That guard was the literal string
 * "24-118" (year 24, job 118), which is an entirely ordinary agency job
 * number, so a contractor bidding a real 24-118 was shown another project's
 * RFIs under a heading claiming "Constimator found discrepancies and gaps
 * between the bid form, plans, specs, and geotech" for documents it had never
 * read.
 *
 * The panel and its card are gone rather than re-gated: a guard on a value a
 * customer can legitimately type is not a guard, and nothing else rendered
 * them. lib/rfi-suggestions-data.ts is left in place for reference —
 * lib/rfi-draft.ts, which builds the real per-callout RFI text on
 * /reconciliation/sheets, cites it as the house style for how a draft reads.
 *
 * Takes no props now; the caller no longer needs to pass the project.
 */
export function RisksTab() {
  return (
    <Empty className="border py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShieldAlert />
        </EmptyMedia>
        <EmptyTitle>Risk detection isn&apos;t available yet</EmptyTitle>
        <EmptyDescription>
          Constimator doesn&apos;t currently flag plan conflicts, missing
          information, or draft RFIs from your documents — that requires
          extraction beyond quantities, which isn&apos;t built yet. Review
          your specs and drawings directly for now.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
