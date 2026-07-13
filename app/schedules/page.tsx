import { SourceReferenceProvider } from "@/components/intelligence/source-reference"
import { SchedulesTab } from "@/components/intelligence/schedules-tab"
import { demoProject } from "@/lib/demo-data"

export default function SchedulesPage() {
  return (
    <SourceReferenceProvider>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Schedules &amp; Tables
          </h1>
          <p className="text-sm text-muted-foreground">
            {demoProject.name} · #{demoProject.number}
          </p>
        </div>
        <SchedulesTab />
      </div>
    </SourceReferenceProvider>
  )
}
