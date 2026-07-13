"use client"

import type { LucideIcon } from "lucide-react"
import { ArrowUpRight } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type SummaryCard = {
  label: string
  value: string
  subtitle: string
  icon: LucideIcon
  href: string | null
  tone?: "warning" | "review"
}

export function SummaryCards({
  cards,
  onNavigate,
}: {
  cards: SummaryCard[]
  onNavigate: (href: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        const clickable = Boolean(card.href)
        return (
          <Card
            key={card.label}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? () => onNavigate(card.href as string) : undefined}
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onNavigate(card.href as string)
                    }
                  }
                : undefined
            }
            className={cn(
              "transition-colors",
              clickable && "cursor-pointer hover:border-primary/50 hover:bg-accent/40",
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-md",
                  card.tone === "warning" && "bg-warning/15 text-warning",
                  card.tone === "review" && "bg-review/15 text-review",
                  !card.tone && "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <div className="text-2xl font-semibold tabular-nums">{card.value}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{card.subtitle}</span>
                {clickable ? <ArrowUpRight className="size-3" /> : null}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
