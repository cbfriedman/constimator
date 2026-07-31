import { eq } from "drizzle-orm"

import { getProcessingStatus } from "@/app/processing/actions"
import { NoProjectState } from "@/components/no-project-state"
import { ProcessingShell } from "@/components/processing/processing-shell"
import { projects } from "@/db/schema"
import { getCurrentProject } from "@/lib/current-project"
import { getScopedDb } from "@/lib/db/scoped"

export default async function ProcessingPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const { project: projectId } = await searchParams
  const scopedDb = await getScopedDb()

  // Unlike /upload, a missing ?project= here falls back to the org's
  // current project (same convention as cost-setup/estimate/reconciliation)
  // rather than hard-erroring — this is a status view, not an action that
  // needs an explicit target, so a bookmark or direct nav to /processing
  // should still show something useful.
  const project = projectId
    ? await scopedDb.projects.findFirst(eq(projects.id, projectId))
    : await getCurrentProject(scopedDb)

  if (!project) {
    return (
      <NoProjectState
        title="No project found"
        description="Create a project and upload documents before checking processing status."
      />
    )
  }

  const initialItems = await getProcessingStatus(project.id)

  return (
    <ProcessingShell
      projectId={project.id}
      projectName={project.name}
      projectNumber={project.number}
      initialItems={initialItems}
    />
  )
}
