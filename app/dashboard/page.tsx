import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { getRecentActivity } from "@/lib/activity"
import { pickCurrentProject } from "@/lib/current-project"
import { getScopedDb } from "@/lib/db/scoped"
import { sortByBidDate, toDashboardProject } from "@/lib/projects"

export default async function DashboardPage() {
  const scopedDb = await getScopedDb()
  const rows = await scopedDb.projects.findMany()
  const projects = sortByBidDate(rows).map(toDashboardProject)
  const currentProjectId = pickCurrentProject(rows)?.id ?? null
  const activity = await getRecentActivity(scopedDb)

  return (
    <DashboardShell
      projects={projects}
      currentProjectId={currentProjectId}
      activity={activity}
    />
  )
}
