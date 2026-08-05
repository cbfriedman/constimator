import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { getIntelligenceData } from "@/app/intelligence/actions"
import { SourceReferenceProvider } from "@/components/intelligence/source-reference"
import { SchedulesTab } from "@/components/intelligence/schedules-tab"
import { ProjectHeader } from "@/components/project-header"
import { NoProjectState } from "@/components/no-project-state"
import { Button } from "@/components/ui/button"

export default async function SchedulesPage() {
  const { project, items } = await getIntelligenceData()

  if (!project) {
    return (
      <NoProjectState
        title="No project yet"
        description="Create a project and upload documents to see extracted schedules."
      />
    )
  }

  return (
    <SourceReferenceProvider>
      <div className="flex h-full flex-col">
        <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 pb-28">
          <div className="mb-6">
            <ProjectHeader
              title="Schedules & Tables"
              subtitle={`${project.name} · #${project.number}`}
            />
          </div>
          <SchedulesTab items={items} />
        </div>
        <div className="sticky bottom-0 z-10 border-t bg-background/95 supports-backdrop-filter:backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-2 px-6 py-3">
            <Button variant="outline" render={<Link href="/cost-setup" />}>
              Complete Cost Setup
            </Button>
            <Button render={<Link href="/estimate" />}>
              Open Estimate Workspace
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </div>
    </SourceReferenceProvider>
  )
}
