import { SourceReferenceProvider } from "@/components/intelligence/source-reference"
import { SchedulesTab } from "@/components/intelligence/schedules-tab"
import { ProjectHeader } from "@/components/project-header"
import { demoProject } from "@/lib/demo-data"

export default function SchedulesPage() {
  return (
    <SourceReferenceProvider>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <ProjectHeader
            title="Schedules & Tables"
            subtitle={`${demoProject.name} · #${demoProject.number}`}
          />
        </div>
        <SchedulesTab />
      </div>
    </SourceReferenceProvider>
  )
}
