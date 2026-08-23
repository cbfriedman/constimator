import { listSubQuotesForReview } from "@/app/sub-quotes/actions"
import { NoProjectState } from "@/components/no-project-state"
import { SubQuoteUploadShell } from "@/components/sub-quotes/upload-shell"
import { getCurrentProject } from "@/lib/current-project"
import { getScopedDb } from "@/lib/db/scoped"

export default async function UploadSubQuotesPage() {
  const scopedDb = await getScopedDb()
  const project = await getCurrentProject(scopedDb)

  if (!project) {
    return (
      <NoProjectState
        title="No project yet"
        description="Create a project before uploading subcontractor quotes to it."
      />
    )
  }

  const existing = await listSubQuotesForReview(project.id)

  return (
    <SubQuoteUploadShell
      projectId={project.id}
      projectName={project.name}
      existing={existing}
    />
  )
}
