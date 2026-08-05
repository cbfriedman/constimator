"use client"

import { Eye, FileText, Upload } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { getDocumentViewUrlAction } from "@/app/upload/actions"
import type { DocumentView } from "@/app/intelligence/actions"

const TYPE_LABELS: Record<string, string> = {
  plans: "Plans",
  specifications: "Specifications",
  bid_form: "Official Bid Form",
  addendum: "Addendum",
  other: "Other",
}

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Uploaded",
  processing: "Processing",
  processed: "Processed",
  failed: "Failed to process",
}

async function handleView(documentId: string) {
  try {
    const url = await getDocumentViewUrlAction(documentId)
    window.open(url, "_blank", "noopener,noreferrer")
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Couldn't open this document.")
  }
}

export function DocumentsTab({
  documents,
  projectId,
}: {
  documents: DocumentView[]
  projectId: string
}) {
  if (documents.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>No documents yet</EmptyTitle>
          <EmptyDescription>
            Upload plans, specs, and the official bid form to get started.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link href={`/upload?project=${projectId}`} />}>
            <Upload data-icon="inline-start" />
            Upload Documents
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Documents</CardTitle>
        <CardDescription>
          Source files uploaded for this project.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md border bg-muted/40">
                  <FileText className="size-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {doc.fileName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {TYPE_LABELS[doc.type] ?? doc.type} ·{" "}
                    {STATUS_LABELS[doc.status] ?? doc.status}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleView(doc.id)}
              >
                <Eye data-icon="inline-start" />
                View
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
