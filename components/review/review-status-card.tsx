import { Clock, MessageSquareText } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const SCOPE_LABELS: Record<string, string> = {
  full: "Full estimate review",
  reconciliation: "Bid form reconciliation review",
  discrepancy: "Quantity discrepancy review",
  proposal: "Final proposal review",
}

const STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  in_progress: "In progress",
  completed: "Completed",
}

const STATUS_STYLES: Record<string, string> = {
  requested: "border-warning/30 bg-warning/10 text-warning",
  in_progress: "border-primary/30 bg-primary/10 text-primary",
  completed: "border-success/30 bg-success/10 text-success",
}

function formatDateTime(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function ReviewStatusCard({
  scope,
  notes,
  status,
  createdAt,
}: {
  scope: string[]
  notes: string | null
  status: string
  createdAt: Date
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Review Requested</CardTitle>
              <CardDescription>Submitted {formatDateTime(createdAt)}</CardDescription>
            </div>
            <Badge variant="outline" className={STATUS_STYLES[status]}>
              {STATUS_LABELS[status] ?? status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Scope
            </span>
            <div className="flex flex-wrap gap-2">
              {scope.map((s) => (
                <Badge key={s} variant="outline">
                  {SCOPE_LABELS[s] ?? s}
                </Badge>
              ))}
            </div>
          </div>
          {notes ? (
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <MessageSquareText className="size-3.5" />
                Notes
              </span>
              <p className="rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed text-foreground">
                {notes}
              </p>
            </div>
          ) : null}
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            <Clock className="size-4 shrink-0 text-primary" />
            <span>
              This is a real request, reviewed manually right now — we&apos;ll
              follow up by email. Automated reviewer matching isn&apos;t built
              yet.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
