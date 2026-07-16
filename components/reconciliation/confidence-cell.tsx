"use client"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function ConfidenceCell({ value }: { value: number }) {
  const low = value < 70

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className="flex w-20 cursor-default flex-col gap-1" />
        }
      >
        <span
          className={cn(
            "text-xs font-medium tabular-nums",
            low ? "text-warning" : "text-foreground",
          )}
        >
          {value}%
        </span>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full",
              low ? "bg-warning" : "bg-success",
            )}
            style={{ width: `${value}%` }}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        Based on clarity of source documents and agreement across sheets.
      </TooltipContent>
    </Tooltip>
  )
}
