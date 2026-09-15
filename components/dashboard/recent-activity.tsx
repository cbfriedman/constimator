import type { ActivityItem } from "@/lib/activity"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import styles from "./dashboard.module.css"

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
    <section className={styles.panel} aria-labelledby="recent-activity-heading">
      <div className={styles.panelHeading}>
        <h2 id="recent-activity-heading">Recent Activity</h2>
        <Link href="/projects" className={styles.activityLink}>
          View projects <ArrowUpRight size={13} aria-hidden="true" />
        </Link>
      </div>
      <div className={styles.activityList}>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing yet. Uploading a document or building an estimate will show
            up here.
          </p>
        ) : (
          items.map((item) => (
            <div key={`${item.at}-${item.text}`} className={styles.activityRow}>
              <div className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{item.text}</span>
              </div>
              <time
                dateTime={item.at}
                className="shrink-0 text-xs text-muted-foreground tabular-nums"
              >
                {formatWhen(item.at)}
              </time>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
