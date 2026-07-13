"use client"

import { Check, Zap } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { comingSoonSources } from "@/lib/estimate-data"

export function CostSourceMenu({ label }: { label: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Cost source for ${label}`}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-1 focus-visible:outline-ring"
      >
        <Zap className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Cost source</DropdownMenuLabel>
          <DropdownMenuItem>
            <Check className="text-success" />
            Manual entry
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Automated sources</DropdownMenuLabel>
          {comingSoonSources.map((source) => (
            <DropdownMenuItem
              key={source}
              disabled
              className="flex items-center justify-between gap-2"
            >
              <span>{source}</span>
              <Badge variant="secondary" className="font-normal">
                Coming soon
              </Badge>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
