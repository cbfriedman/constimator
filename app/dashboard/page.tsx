import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { getScopedDb } from "@/lib/db/scoped"
import { sortByBidDate, toDashboardProject } from "@/lib/projects"

export default async function DashboardPage() {
  const scopedDb = await getScopedDb()
  const rows = await scopedDb.projects.findMany()
  const projects = sortByBidDate(rows).map(toDashboardProject)

  return <DashboardShell projects={projects} />
}
