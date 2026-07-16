import type { ReactNode } from "react"

import { BidCountdownBadge } from "@/components/bid-countdown-badge"

/**
 * Consistent header for project pages: title + subtitle on the left,
 * optional inline badges, and the shared "42 days to bid" chip on the right.
 */
export function ProjectHeader({
  title,
  subtitle,
  badges,
  actions,
}: {
  title: string
  subtitle?: ReactNode
  badges?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {title}
          </h1>
          {badges}
        </div>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <BidCountdownBadge />
      </div>
    </div>
  )
}
