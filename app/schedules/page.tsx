"use client"

import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"

import { SourceReferenceProvider } from "@/components/intelligence/source-reference"
import { SchedulesTab } from "@/components/intelligence/schedules-tab"
import { ProjectHeader } from "@/components/project-header"
import { Button } from "@/components/ui/button"
import { demoProject } from "@/lib/mock-data"

export default function SchedulesPage() {
  const router = useRouter()

  return (
    <SourceReferenceProvider>
      <div className="flex h-full flex-col">
        <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 pb-28">
          <div className="mb-6">
            <ProjectHeader
              title="Schedules & Tables"
              subtitle={`${demoProject.name} · #${demoProject.number}`}
            />
          </div>
          <SchedulesTab />
        </div>
        <div className="sticky bottom-0 z-10 border-t bg-background/95 supports-backdrop-filter:backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-2 px-6 py-3">
            <Button variant="outline" onClick={() => router.push("/cost-setup")}>
              Complete Cost Setup
            </Button>
            <Button onClick={() => router.push("/estimate")}>
              Open Estimate Workspace
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </div>
    </SourceReferenceProvider>
  )
}
