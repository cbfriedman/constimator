import type { ActivityItem } from "@/lib/activity"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Items carry an ISO timestamp rather than a pre-formatted "Jul 10" string
// (which is what the old hardcoded mock array held) so the date is
// formatted in one place, against the reader's locale.
function formatWhen(at: string): string {
  const date = new Date(at)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing yet. Uploading a document or building an estimate will show up here.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={`${item.at}-${item.text}`}
              className="flex items-start justify-between gap-4 border-b pb-3 text-sm last:border-0 last:pb-0"
            >
              <div className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{item.text}</span>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {formatWhen(item.at)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
