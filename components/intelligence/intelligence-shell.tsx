"use client"

import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ProjectHeader } from "@/components/project-header"
import { SourceReferenceProvider } from "@/components/intelligence/source-reference"
import { OverviewTab } from "@/components/intelligence/overview-tab"
import { SchedulesTab } from "@/components/intelligence/schedules-tab"
import { BidRequirementsTab } from "@/components/intelligence/bid-requirements-tab"
import { RisksTab } from "@/components/intelligence/risks-tab"
import { DocumentsTab } from "@/components/intelligence/documents-tab"
import type {
  DocumentView,
  ExtractedItemView,
  IntelligenceProjectView,
  ParticipationGoalView,
  SpecLinkView,
} from "@/app/intelligence/actions"

export function IntelligenceShell({
  project,
  documents,
  items,
  participationGoals,
  specLinks,
  specsAnalyzed,
}: {
  project: IntelligenceProjectView
  documents: DocumentView[]
  items: ExtractedItemView[]
  participationGoals: ParticipationGoalView[]
  specLinks: SpecLinkView[]
  specsAnalyzed: boolean
}) {
  const router = useRouter()
  // Specs contribute no items — they're read for the participation
  // requirement, not for quantities — so a project whose only processed
  // document is a spec book has still been analyzed.
  const hasCompletedProcessing = items.length > 0 || specsAnalyzed

  return (
    <SourceReferenceProvider>
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-6 py-8 pb-28">
            <div className="mb-6">
              <ProjectHeader
                title="Project Intelligence"
                subtitle={`${project.name} · #${project.number}`}
                badges={
                  hasCompletedProcessing ? (
                    <Badge className="border border-review/30 bg-review/10 text-review">
                      AI analyzed
                    </Badge>
                  ) : null
                }
              />
            </div>

            <Tabs defaultValue="overview" className="gap-6">
              <TabsList className="h-9">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="schedules">Schedules & Tables</TabsTrigger>
                <TabsTrigger value="bid-requirements">
                  Bid Requirements
                </TabsTrigger>
                <TabsTrigger value="risks">Risks & RFIs</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <OverviewTab
                  project={project}
                  items={items}
                  participationGoals={participationGoals}
                  specLinks={specLinks}
                  specsAnalyzed={specsAnalyzed}
                />
              </TabsContent>
              <TabsContent value="schedules">
                <SchedulesTab items={items} />
              </TabsContent>
              <TabsContent value="bid-requirements">
                <BidRequirementsTab project={project} />
              </TabsContent>
              <TabsContent value="risks">
                <RisksTab project={project} />
              </TabsContent>
              <TabsContent value="documents">
                <DocumentsTab documents={documents} projectId={project.id} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 border-t bg-background/95 supports-backdrop-filter:backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-2 px-6 py-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/upload?project=${project.id}`)}
            >
              Upload Documents
            </Button>
            <Button variant="outline" onClick={() => router.push("/schedules")}>
              Schedules &amp; Tables
            </Button>
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
