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

  // Data first, JSX after: building the element inside the try would put a
  // render under the catch, so an error thrown while React renders
  // DashboardShell would be reported as a data failure and swallowed into the
  // card below (react-hooks/error-boundaries).
  let data: {
    projects: ReturnType<typeof toDashboardProject>[]
    currentProjectId: string | null
    activity: Awaited<ReturnType<typeof getRecentActivity>>
  } | null = null

  try {
    const scopedDb = await getScopedDb()
    const rows = await scopedDb.projects.findMany()
    data = {
      projects: forceEmpty ? [] : sortByBidDate(rows).map(toDashboardProject),
      currentProjectId: forceEmpty ? null : (pickCurrentProject(rows)?.id ?? null),
      activity: forceEmpty ? [] : await getRecentActivity(scopedDb),
    }
  } catch (error) {
    // redirect() signals by throwing, so this has to run outside the try that
    // would otherwise catch its own control-flow exception.
    if (error instanceof UnauthenticatedError) {
      redirect("/sign-in")
    }
    logger.error("DashboardPage failed", undefined, error)
  }

  if (!data) {
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

  return (
    <DashboardShell
      projects={data.projects}
      currentProjectId={data.currentProjectId}
      activity={data.activity}
    />
  )
}
