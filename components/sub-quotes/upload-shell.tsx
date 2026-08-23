"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CloudUpload,
  FileText,
  Loader2,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import {
  confirmSubQuoteUpload,
  removeSubQuote,
  requestSubQuoteUpload,
  type SubQuoteListItem,
} from "@/app/sub-quotes/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ProjectHeader } from "@/components/project-header"
import { cn } from "@/lib/utils"

// The entry point for the whole sub-quote pipeline. Everything downstream —
// extraction, review, the comparison grid — was reachable only by inserting
// rows by hand until this existed.
//
// Why it isn't part of the general /upload screen: a sub quote needs the sub's
// name and trade recorded *with* the file. The general uploader has no fields
// for those, and a quote with neither is a document that can't go in a
// comparison grid. See components/upload/documents-table.tsx.

/** Mirrors SUB_QUOTE_MIME_TYPES in lib/document-upload.ts, which the Server Action enforces regardless of what this input accepts. */
const ACCEPT = "application/pdf,image/jpeg,image/png"
const ACCEPTED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"])

type PendingFile = {
  /** Client-side only, for list keys before anything is saved. */
  key: string
  file: File
  subName: string
  trade: string
  status: "ready" | "uploading" | "done" | "error"
  progress: number
  error: string | null
}

let keySeq = 0

function uploadWithProgress(url: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", url)
    xhr.setRequestHeader("Content-Type", file.type)
    xhr.setRequestHeader("x-upsert", "false")
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed (status ${xhr.status}).`))
    }
    xhr.onerror = () => reject(new Error("Upload failed — check your connection."))
    xhr.send(file)
  })
}

export function SubQuoteUploadShell({
  projectId,
  projectName,
  existing,
}: {
  projectId: string
  projectName: string
  existing: SubQuoteListItem[]
}) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [pending, setPending] = React.useState<PendingFile[]>([])
  const [dragging, setDragging] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  /** The last trade typed, applied to each newly added file — a prime uploading six paving quotes shouldn't type "Paving" six times. */
  const lastTrade = React.useRef("")

  function addFiles(files: FileList | File[]) {
    const accepted: PendingFile[] = []
    const rejected: string[] = []

    for (const file of Array.from(files)) {
      if (!ACCEPTED_MIME.has(file.type)) {
        rejected.push(file.name)
        continue
      }
      keySeq += 1
      accepted.push({
        key: `f${keySeq}`,
        file,
        // A sub's name is usually the filename; pre-filling it beats an empty
        // box, and it stays editable because filenames are often wrong.
        subName: file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim(),
        trade: lastTrade.current,
        status: "ready",
        progress: 0,
        error: null,
      })
    }

    if (rejected.length > 0) {
      toast.error(
        `${rejected.length === 1 ? "That file isn't" : "Those files aren't"} a supported type. Sub quotes can be PDF, JPG, or PNG — including a photo of a fax.`,
      )
    }
    if (accepted.length > 0) setPending((prev) => [...prev, ...accepted])
  }

  function update(key: string, patch: Partial<PendingFile>) {
    setPending((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  const readyToUpload = pending.filter(
    (item) => item.status === "ready" && item.subName.trim() && item.trade.trim(),
  )
  const missingDetails = pending.some(
    (item) => item.status === "ready" && (!item.subName.trim() || !item.trade.trim()),
  )

  async function uploadAll() {
    setBusy(true)
    let uploaded = 0

    // Sequential: each file runs a Server Action that touches the database,
    // and lib/db/client.ts caps the pool at max: 1. Uploading six quotes
    // concurrently would contend for that single connection.
    for (const item of readyToUpload) {
      update(item.key, { status: "uploading", progress: 0, error: null })
      try {
        const { signedUrl, path } = await requestSubQuoteUpload({
          projectId,
          fileName: item.file.name,
          fileSize: item.file.size,
          mimeType: item.file.type,
        })

        await uploadWithProgress(signedUrl, item.file, (pct) =>
          update(item.key, { progress: pct }),
        )

        await confirmSubQuoteUpload({
          projectId,
          path,
          fileName: item.file.name,
          fileSizeBytes: item.file.size,
          mimeType: item.file.type,
          subName: item.subName.trim(),
          trade: item.trade.trim(),
        })

        update(item.key, { status: "done", progress: 100 })
        uploaded += 1
      } catch (error) {
        update(item.key, {
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed.",
        })
      }
    }

    setBusy(false)
    if (uploaded > 0) {
      toast.success(
        `${uploaded} quote${uploaded === 1 ? "" : "s"} uploaded. Reading ${uploaded === 1 ? "it" : "them"} now.`,
      )
      router.refresh()
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <ProjectHeader title="Sub quotes" subtitle={projectName} />
        {existing.length > 0 ? (
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href="/sub-quotes" />}>
              Review extracted conditions
            </Button>
            <Button render={<Link href="/sub-quotes/compare" />}>
              Compare quotes
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload quotes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              if (event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files)
            }}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted",
            )}
          >
            <CloudUpload className="size-6 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">
              Drop quotes here, or click to choose
            </span>
            <span className="text-xs text-muted-foreground">
              PDF, JPG, or PNG — a phone photo of a faxed quote works. One sub per file.
            </span>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files)
              // Reset so re-picking the same file fires change again.
              event.target.value = ""
            }}
          />

          {pending.length > 0 ? (
            <>
              <ul className="flex flex-col gap-3">
                {pending.map((item) => (
                  <PendingRow
                    key={item.key}
                    item={item}
                    disabled={busy}
                    onChange={(patch) => {
                      if (patch.trade != null) lastTrade.current = patch.trade
                      update(item.key, patch)
                    }}
                    onRemove={() =>
                      setPending((prev) => prev.filter((entry) => entry.key !== item.key))
                    }
                  />
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
                <Button onClick={uploadAll} disabled={busy || readyToUpload.length === 0}>
                  {busy ? (
                    <>
                      <Loader2 data-icon="inline-start" className="animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    `Upload ${readyToUpload.length || ""} quote${readyToUpload.length === 1 ? "" : "s"}`.trim()
                  )}
                </Button>
                {missingDetails ? (
                  <span className="text-xs text-muted-foreground">
                    Every quote needs a sub name and a trade before it can be uploaded —
                    without them it can&apos;t go in a comparison grid.
                  </span>
                ) : null}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {existing.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uploaded ({existing.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {existing.map((quote) => (
                <ExistingRow key={quote.id} quote={quote} onRemoved={() => router.refresh()} />
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function PendingRow({
  item,
  disabled,
  onChange,
  onRemove,
}: {
  item: PendingFile
  disabled: boolean
  onChange: (patch: Partial<PendingFile>) => void
  onRemove: () => void
}) {
  const locked = item.status === "uploading" || item.status === "done"

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate text-sm text-foreground" title={item.file.name}>
            {item.file.name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {item.status === "done" ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Uploaded
            </span>
          ) : null}
          {item.status === "uploading" ? (
            <span className="text-xs text-muted-foreground tabular-nums">{item.progress}%</span>
          ) : null}
          {!locked ? (
            <Button variant="ghost" size="sm" onClick={onRemove} disabled={disabled}>
              <X aria-hidden="true" />
              <span className="sr-only">Remove {item.file.name}</span>
            </Button>
          ) : null}
        </div>
      </div>

      {item.status !== "done" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`sub-${item.key}`}>Subcontractor</FieldLabel>
            <Input
              id={`sub-${item.key}`}
              value={item.subName}
              disabled={locked || disabled}
              onChange={(event) => onChange({ subName: event.target.value })}
              placeholder="e.g. Valley Striping"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`trade-${item.key}`}>Trade</FieldLabel>
            <Input
              id={`trade-${item.key}`}
              value={item.trade}
              disabled={locked || disabled}
              onChange={(event) => onChange({ trade: event.target.value })}
              placeholder="e.g. Paving"
            />
          </Field>
        </div>
      ) : null}

      {item.error ? (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {item.error}
        </p>
      ) : null}
    </li>
  )
}

const STATUS_LABELS: Record<SubQuoteListItem["status"], string> = {
  uploaded: "Queued for reading",
  extracting: "Being read",
  needs_review: "Needs review",
  confirmed: "Confirmed",
  failed: "Couldn't be read",
}

function ExistingRow({
  quote,
  onRemoved,
}: {
  quote: SubQuoteListItem
  onRemoved: () => void
}) {
  const [removing, setRemoving] = React.useState(false)

  async function remove() {
    setRemoving(true)
    try {
      await removeSubQuote(quote.id)
      toast.success(`${quote.subName} removed.`)
      onRemoved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove that quote.")
      setRemoving(false)
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-medium text-foreground">{quote.subName}</span>
        <span className="text-xs text-muted-foreground">{quote.trade}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline">{STATUS_LABELS[quote.status]}</Badge>
        {quote.total > 0 ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {quote.confirmed} of {quote.total} confirmed
          </span>
        ) : null}
        <Button variant="ghost" size="sm" onClick={remove} disabled={removing}>
          <Trash2 aria-hidden="true" />
          <span className="sr-only">Remove {quote.subName}</span>
        </Button>
      </div>
    </li>
  )
}
