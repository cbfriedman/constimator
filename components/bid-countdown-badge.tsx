import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * Shared "42 days to bid" countdown chip.
 * Single source of truth so every project page renders it identically.
 */
export function BidCountdownBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 border-warning/40 bg-warning/10 text-warning",
        className,
      )}
    >
      42 days to bid
    </Badge>
  )
}
