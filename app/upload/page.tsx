"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, CloudUpload } from "lucide-react"

import {
  DocumentsTable,
  docTypeOptions,
  type UploadDoc,
} from "@/components/upload/documents-table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ProjectHeader } from "@/components/project-header"
import { demoProject } from "@/lib/demo-data"

const initialDocs: UploadDoc[] = [
  { id: "plans", file: "Plans.pdf", type: "Plans", pages: "64 sheets", size: "88 MB", status: "uploaded" },
  { id: "specs", file: "Specifications.pdf", type: "Specifications", pages: "412 pages", size: "12 MB", status: "uploaded" },
  { id: "add01", file: "Addendum_01.pdf", type: "Addendum", pages: "6 pages", size: "1.2 MB", status: "uploaded" },
  { id: "bidform", file: "Official_Bid_Form.pdf", type: "Official Bid Form", pages: "9 pages", size: "0.8 MB", status: "uploaded" },
  { id: "geotech", file: "Geotechnical_Report.pdf", type: "Supporting Document", pages: "48 pages", size: "9 MB", status: "uploading", progress: 62 },
]

const checklist = [
  "Plans",
  "Specifications",
  "Addenda",
  "Official Bid Form",
  "Supporting Docs",
]

export default function UploadPage() {
  const router = useRouter()
  const [docs, setDocs] = useState<UploadDoc[]>(initialDocs)
  const [continueAnyway, setContinueAnyway] = useState(false)

  // Scripted: finish the in-progress upload after 2 seconds.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDocs((prev) =>
        prev.map((doc) =>
          doc.id === "geotech"
            ? { ...doc, status: "uploaded", progress: 100 }
            : doc,
        ),
      )
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  const hasBidForm = docs.some((doc) => doc.type === "Official Bid Form")

  function handleTypeChange(id: string, type: UploadDoc["type"]) {
    setDocs((prev) => prev.map((doc) => (doc.id === id ? { ...doc, type } : doc)))
  }

  function handleRemove(id: string) {
    setDocs((prev) => prev.filter((doc) => doc.id !== id))
  }

  function handleRestoreBidForm() {
    setDocs((prev) => {
      if (prev.some((doc) => doc.id === "bidform")) return prev
      const restored = initialDocs.find((doc) => doc.id === "bidform")!
      const insertIndex = 3
      const next = [...prev]
      next.splice(Math.min(insertIndex, next.length), 0, restored)
      return next
    })
    setContinueAnyway(false)
  }

  const analysisDisabled = !hasBidForm && !continueAnyway

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <ProjectHeader
        title={demoProject.name}
        subtitle="Upload plans, specs, addenda, and the official bid form."
      />

      {!hasBidForm ? (
        <Alert className="border-warning/40 bg-warning/10">
          <AlertTriangle className="text-warning" />
          <AlertTitle>No Official Bid Form detected</AlertTitle>
          <AlertDescription>
            You can still analyze the project, but Bid Form Reconciliation
            won&apos;t be available.
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={handleRestoreBidForm}>
                Upload Bid Form
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setContinueAnyway(true)}
              >
                Continue Anyway
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <button
        type="button"
        className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-12 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CloudUpload className="size-6" />
        </span>
        <span className="text-sm font-medium">
          Drop plans, specs, addenda, and the official bid form here
        </span>
        <span className="text-xs text-muted-foreground">
          PDF up to 500 MB each
        </span>
        <span className="mt-1 inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium">
          Browse Files
        </span>
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem]">
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentsTable
              docs={docs}
              onTypeChange={handleTypeChange}
              onRemove={handleRemove}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Checklist</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {checklist.map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="size-4 text-success" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Alert className="border-primary/30 bg-primary/5">
            <AlertDescription className="text-foreground">
              The Official Bid Form is required for Bid Form Reconciliation.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Save &amp; Finish Later
        </Button>
        <Button
          disabled={analysisDisabled}
          onClick={() => router.push("/processing")}
        >
          Start AI Analysis
        </Button>
      </footer>
    </div>
  )
}
