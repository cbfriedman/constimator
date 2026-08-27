import { listPlanHolderListsForReview } from "@/app/plan-holders/actions"
import { NoProjectState } from "@/components/no-project-state"
import { PlanHolderUploadShell } from "@/components/plan-holders/upload-shell"
import { getCurrentProject } from "@/lib/current-project"
import { getScopedDb } from "@/lib/db/scoped"

export default async function UploadPlanHoldersPage() {
  const scopedDb = await getScopedDb()
  const project = await getCurrentProject(scopedDb)

  if (!project) {
    return (
      <NoProjectState
        title="No project yet"
        description="Create a project before uploading a plan holders list to it."
      />
    )
  }

  const existing = await listPlanHolderListsForReview(project.id)

  return (
    <PlanHolderUploadShell
      projectId={project.id}
      projectName={project.name}
      existing={existing}
    />
  )
}
