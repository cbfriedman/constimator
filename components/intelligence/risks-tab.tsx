import { ShieldAlert } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

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
