"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  CloudUpload,
} from "lucide-react"

import {
  DocumentsTable,
  type DocType,
  type SelectableDocType,
  type UploadDoc,
} from "@/components/upload/documents-table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProjectHeader } from "@/components/project-header"
import {
  confirmDocumentUpload,
  removeDocument,
  requestDocumentUpload,
  updateDocumentType,
  type DbDocType,
  type UploadableDocType,
} from "@/app/upload/actions"

const DB_TO_UI_TYPE: Record<DbDocType, DocType> = {
  plans: "Plans",
  specifications: "Specifications",
  addendum: "Addendum",
  bid_form: "Official Bid Form",
  sub_quote: "Sub Quote",
  other: "Supporting Document",
}

// Keyed on SelectableDocType, not DocType — "Sub Quote" is absent because
// the picker can't produce it (see documents-table.tsx), and typing it this
// way makes that a compile error rather than a dead entry.
const UI_TO_DB_TYPE: Record<SelectableDocType, UploadableDocType> = {
  Plans: "plans",
  Specifications: "specifications",
  Addendum: "addendum",
  "Official Bid Form": "bid_form",
  "Supporting Document": "other",
}

const ALLOWED_MIME_TYPES = ["application/pdf"]
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024

const checklist: { label: string; type: DocType }[] = [
  { label: "Plans", type: "Plans" },
  { label: "Specifications", type: "Specifications" },
  { label: "Addenda", type: "Addendum" },
  { label: "Official Bid Form", type: "Official Bid Form" },
  { label: "Supporting Docs", type: "Supporting Document" },
]

function formatSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", url)
    xhr.setRequestHeader("Content-Type", file.type)
    xhr.setRequestHeader("x-upsert", "false")
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed (status ${xhr.status}).`))
    }
    xhr.onerror = () => reject(new Error("Upload failed — check your connection."))
    xhr.send(file)
  })
}

export function UploadShell({
  projectId,
  projectName,
  initialDocs,
}: {
  projectId: string
  projectName: string
  initialDocs: UploadDoc[]
}) {
  const router = useRouter()
  const [docs, setDocs] = useState<UploadDoc[]>(initialDocs)
  const [continueAnyway, setContinueAnyway] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasBidForm = docs.some(
    (doc) => doc.type === "Official Bid Form" && doc.status === "uploaded",
  )

  async function uploadFile(file: File) {
    const tempId = crypto.randomUUID()
    const baseDoc: UploadDoc = {
      id: tempId,
      file: file.name,
      type: "Supporting Document",
      pages: "—",
      size: formatSize(file.size),
      status: "uploading",
      progress: 0,
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setDocs((prev) => [
        ...prev,
        { ...baseDoc, status: "error", errorMessage: "Only PDF files are allowed." },
      ])
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setDocs((prev) => [
        ...prev,
        { ...baseDoc, status: "error", errorMessage: "File exceeds the 500 MB limit." },
      ])
      return
    }

    setDocs((prev) => [...prev, baseDoc])

    try {
      const { signedUrl, path } = await requestDocumentUpload({
        projectId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      })

      await uploadWithProgress(signedUrl, file, (pct) => {
        setDocs((prev) =>
          prev.map((doc) => (doc.id === tempId ? { ...doc, progress: pct } : doc)),
        )
      })

      const document = await confirmDocumentUpload({
        projectId,
        path,
        fileName: file.name,
        mimeType: file.type,
        fileSizeBytes: file.size,
        type: "other",
      })

      setDocs((prev) =>
        prev.map((doc) =>
          doc.id === tempId
            ? {
                id: document.id,
                file: document.fileName,
                type: DB_TO_UI_TYPE[document.type as DbDocType],
                pages: "—",
                size: formatSize(document.fileSizeBytes ?? file.size),
                status: "uploaded",
              }
            : doc,
        ),
      )
    } catch (err) {
      setDocs((prev) =>
        prev.map((doc) =>
          doc.id === tempId
            ? {
                ...doc,
                status: "error",
                errorMessage: err instanceof Error ? err.message : "Upload failed.",
              }
            : doc,
        ),
      )
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach(uploadFile)
  }

  async function handleTypeChange(id: string, type: SelectableDocType) {
    const doc = docs.find((d) => d.id === id)
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, type } : d)))
    if (doc?.status === "uploaded") {
      await updateDocumentType(id, UI_TO_DB_TYPE[type]).catch(() => {})
    }
  }

  async function handleRemove(id: string) {
    const doc = docs.find((d) => d.id === id)
    setDocs((prev) => prev.filter((d) => d.id !== id))
    if (doc?.status === "uploaded") {
      await removeDocument(id).catch(() => {})
    }
  }

  const analysisDisabled = !hasBidForm && !continueAnyway

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <ProjectHeader
        title={projectName}
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
              <Button size="sm" variant="outline" onClick={() => setContinueAnyway(true)}>
                Continue Anyway
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ""
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={
          "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors " +
          (isDragging
            ? "border-primary/50 bg-muted/50"
            : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50")
        }
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
            {docs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No documents uploaded yet.
              </p>
            ) : (
              <DocumentsTable
                docs={docs}
                onTypeChange={handleTypeChange}
                onRemove={handleRemove}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Checklist</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {checklist.map((item) => {
                const satisfied = docs.some(
                  (doc) => doc.type === item.type && doc.status === "uploaded",
                )
                return (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    {satisfied ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : (
                      <Circle className="size-4 text-muted-foreground" />
                    )}
                    <span className={satisfied ? undefined : "text-muted-foreground"}>
                      {item.label}
                    </span>
                  </div>
                )
              })}
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
          onClick={() => router.push(`/processing?project=${projectId}`)}
        >
          Start AI Analysis
        </Button>
      </footer>
    </div>
  )
}
