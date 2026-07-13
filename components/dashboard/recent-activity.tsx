import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function RecentActivity({
  items,
}: {
  items: { text: string; date: string }[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-4 border-b pb-3 text-sm last:border-0 last:pb-0"
          >
            <div className="flex items-start gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{item.text}</span>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {item.date}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
