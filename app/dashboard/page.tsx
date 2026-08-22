import Link from "next/link"
import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { getRecentActivity } from "@/lib/activity"
import { pickCurrentProject } from "@/lib/current-project"
import { getScopedDb, UnauthenticatedError } from "@/lib/db/scoped"
import { logger } from "@/lib/logger"
import { sortByBidDate, toDashboardProject } from "@/lib/projects"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>
}) {
  const { empty } = await searchParams
  const forceEmpty = empty === "1"

  try {
    const scopedDb = await getScopedDb()
    const rows = await scopedDb.projects.findMany()
    const projects = forceEmpty ? [] : sortByBidDate(rows).map(toDashboardProject)
    const currentProjectId = forceEmpty
      ? null
      : (pickCurrentProject(rows)?.id ?? null)
    const activity = forceEmpty ? [] : await getRecentActivity(scopedDb)

    return (
      <DashboardShell
        projects={projects}
        currentProjectId={currentProjectId}
        activity={activity}
      />
    )
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect("/sign-in")
    }
    logger.error("DashboardPage failed", undefined, error)
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
        <Alert variant="destructive" className="text-left">
          <AlertTitle>Dashboard couldn&apos;t load</AlertTitle>
          <AlertDescription>
            Your account is signed in, but this page couldn&apos;t read your
            projects. Reload to try again.
          </AlertDescription>
        </Alert>
        <Button render={<Link href="/dashboard" />}>Reload</Button>
      </div>
    )
  }
}
