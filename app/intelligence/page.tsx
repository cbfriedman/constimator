"use client"

import { useRouter } from "next/navigation"
import { ArrowRight, Download } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { SourceReferenceProvider } from "@/components/intelligence/source-reference"
import { OverviewTab } from "@/components/intelligence/overview-tab"
import { SchedulesTab } from "@/components/intelligence/schedules-tab"
import { BidRequirementsTab } from "@/components/intelligence/bid-requirements-tab"
import { RisksTab } from "@/components/intelligence/risks-tab"
import { DocumentsTab } from "@/components/intelligence/documents-tab"
import { demoProject } from "@/lib/demo-data"

export default function IntelligencePage() {
  const router = useRouter()

  return (
    <SourceReferenceProvider>
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-6 py-8 pb-28">
            <div className="mb-6 flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Project Intelligence
                </h1>
                <Badge className="border border-review/30 bg-review/10 text-review">
                  AI analyzed
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {demoProject.name} · #{demoProject.number}
              </p>
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
                <OverviewTab />
              </TabsContent>
              <TabsContent value="schedules">
                <SchedulesTab />
              </TabsContent>
              <TabsContent value="bid-requirements">
                <BidRequirementsTab />
              </TabsContent>
              <TabsContent value="risks">
                <RisksTab />
              </TabsContent>
              <TabsContent value="documents">
                <DocumentsTab />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 border-t bg-background/95 supports-backdrop-filter:backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-6 py-3">
            <Button
              variant="outline"
              onClick={() => toast.success("Project_Brief_24-118.pdf ready")}
            >
              <Download data-icon="inline-start" />
              Export Project Brief (PDF)
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
