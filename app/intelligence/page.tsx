import { getIntelligenceData } from "@/app/intelligence/actions"
import { IntelligenceShell } from "@/components/intelligence/intelligence-shell"
import { NoProjectState } from "@/components/no-project-state"

export default async function IntelligencePage() {
  const { project, documents, items } = await getIntelligenceData()

  if (!project) {
    return (
      <NoProjectState
        title="No project yet"
        description="Create a project and upload documents to see Project Intelligence."
      />
    )
  }

  return <IntelligenceShell project={project} documents={documents} items={items} />
}
