import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type SourceKind =
  | "official"
  | "ai-extracted"
  | "manual"
  | "reviewed"
  | "overridden"

const config: Record<SourceKind, { label: string; className: string }> = {
  official: {
    label: "Official",
    className: "border-transparent bg-primary/10 text-primary",
  },
  "ai-extracted": {
    label: "AI-extracted",
    className: "border-warning/60 bg-transparent text-warning",
  },
  manual: {
    label: "Manual",
    className: "border-transparent bg-muted text-muted-foreground",
  },
  reviewed: {
    label: "Reviewed",
    className: "border-transparent bg-review/10 text-review",
  },
  overridden: {
    label: "Overridden",
    className: "border-transparent bg-destructive/10 text-destructive",
  },
}

export function SourceBadge({
  kind,
  className,
}: {
  kind: SourceKind
  className?: string
}) {
  const { label, className: kindClassName } = config[kind]
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-medium", kindClassName, className)}
    >
      {label}
    </Badge>
  )
}
