"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
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
  confirmPlanHolderUpload,
  removePlanHolderList,
  requestPlanHolderUpload,
  type PlanHolderListItem,
} from "@/app/plan-holders/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ProjectHeader } from "@/components/project-header"
import { cn } from "@/lib/utils"

// The entry point for the plan holders pipeline, and the direct counterpart
// of components/sub-quotes/upload-shell.tsx.
//
// Why it isn't part of the general /upload screen: a plan holders list needs
// a source label recorded *with* the file. Agencies reissue the roster as
// more bidders pull documents, and without a label nobody can tell the 3/14
// issue from the 3/21 one. The general uploader has no field for that. See
// components/upload/documents-table.tsx.

/** Mirrors PDF_MIME_TYPES in lib/document-upload.ts, which the Server Action enforces regardless of what this input accepts. */
const ACCEPT = "application/pdf"
const ACCEPTED_MIME = new Set(["application/pdf"])

type PendingFile = {
  /** Client-side only, for list keys before anything is saved. */
  key: string
  file: File
  sourceLabel: string
  status: "ready" | "uploading" | "done" | "error"
  progress: number
  error: string | null
}

let keySeq = 0

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

export function PlanHolderUploadShell({
  projectId,
  projectName,
  existing,
}: {
  projectId: string
  projectName: string
  existing: PlanHolderListItem[]
}) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [pending, setPending] = React.useState<PendingFile[]>([])
  const [dragging, setDragging] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [removing, setRemoving] = React.useState<string | null>(null)

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
        // The filename is usually the closest thing to a label the agency
        // gave us ("planholders-addendum-2.pdf"). Pre-filling beats an empty
        // box and stays editable, because filenames are often unhelpful.
        sourceLabel: file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[_-]+/g, " ")
          .trim(),
        status: "ready",
        progress: 0,
        error: null,
      })
    }

    if (rejected.length > 0) {
      toast.error(
        `${rejected.length === 1 ? "That file isn't" : "Those files aren't"} a PDF. Plan holder lists are published as PDFs — if you have a scan, save it as a PDF first.`,
      )
    }
    if (accepted.length > 0) setPending((prev) => [...prev, ...accepted])
  }

  function update(key: string, patch: Partial<PendingFile>) {
    setPending((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    )
  }

  const readyToUpload = pending.filter(
    (item) => item.status === "ready" && item.sourceLabel.trim(),
  )
  const missingDetails = pending.some(
    (item) => item.status === "ready" && !item.sourceLabel.trim(),
  )

  async function uploadAll() {
    setBusy(true)
    let uploaded = 0

    // Sequential: each file runs a Server Action that touches the database,
    // and lib/db/client.ts caps the pool at max: 1. Uploading concurrently
    // would contend for that single connection.
    for (const item of readyToUpload) {
      update(item.key, { status: "uploading", progress: 0, error: null })
      try {
        const { signedUrl, path } = await requestPlanHolderUpload({
          projectId,
          fileName: item.file.name,
          fileSize: item.file.size,
          mimeType: item.file.type,
        })

        await uploadWithProgress(signedUrl, item.file, (pct) =>
          update(item.key, { progress: pct }),
        )

        await confirmPlanHolderUpload({
          projectId,
          path,
          fileName: item.file.name,
          fileSizeBytes: item.file.size,
          mimeType: item.file.type,
          sourceLabel: item.sourceLabel.trim(),
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
        `${uploaded} list${uploaded === 1 ? "" : "s"} uploaded. Reading ${uploaded === 1 ? "it" : "them"} now.`,
      )
      router.refresh()
    }
  }

  async function remove(listId: string) {
    setRemoving(listId)
    try {
      await removePlanHolderList(listId)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove this list.",
      )
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <ProjectHeader title="Plan holders" subtitle={projectName} />
        {existing.length > 0 ? (
          <Button render={<Link href="/plan-holders" />}>
            Review plan holders
            <ArrowRight data-icon="inline-end" />
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload a plan holders list</CardTitle>
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
              if (event.dataTransfer.files.length > 0) {
                addFiles(event.dataTransfer.files)
              }
            }}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
              dragging
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted",
            )}
          >
            <CloudUpload
              className="size-6 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-foreground">
              Drop the roster here, or click to choose
            </span>
            <span className="text-xs text-muted-foreground">
              PDF only. Upload each reissue separately — the roster before bid
              day is the one that counts.
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
              event.target.value = ""
            }}
          />

          {pending.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {pending.map((item) => (
                <li
                  key={item.key}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="truncate text-sm font-medium">
                        {item.file.name}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {item.status === "done" ? (
                        <Badge variant="outline" className="text-success">
                          <CheckCircle2 aria-hidden="true" />
                          Uploaded
                        </Badge>
                      ) : null}
                      {item.status === "uploading" ? (
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {item.progress}%
                        </span>
                      ) : null}
                      {item.status === "ready" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Remove ${item.file.name}`}
                          onClick={() =>
                            setPending((prev) =>
                              prev.filter((f) => f.key !== item.key),
                            )
                          }
                        >
                          <X aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {item.status === "ready" ? (
                    <Field>
                      <FieldLabel htmlFor={`label-${item.key}`}>
                        What to call this list
                      </FieldLabel>
                      <Input
                        id={`label-${item.key}`}
                        value={item.sourceLabel}
                        onChange={(event) =>
                          update(item.key, { sourceLabel: event.target.value })
                        }
                        placeholder="e.g. Plan holders as of Addendum 2"
                      />
                    </Field>
                  ) : null}

                  {item.error ? (
                    <p className="text-xs text-destructive">{item.error}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {pending.length > 0 ? (
            <div className="flex items-center gap-3">
              <Button
                disabled={busy || readyToUpload.length === 0}
                onClick={uploadAll}
              >
                {busy ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <CloudUpload data-icon="inline-start" />
                )}
                Upload {readyToUpload.length || ""}
              </Button>
              {missingDetails ? (
                <span className="text-xs text-muted-foreground">
                  Give every list a label before uploading.
                </span>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {existing.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Lists on this project
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y">
              {existing.map((list) => (
                <li
                  key={list.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {list.sourceLabel}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {list.holderCount > 0
                        ? `${list.confirmedCount} of ${list.holderCount} confirmed`
                        : list.status === "failed"
                          ? "Could not be read"
                          : "Being read"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={removing === list.id}
                    aria-label={`Remove ${list.sourceLabel}`}
                    onClick={() => remove(list.id)}
                  >
                    {removing === list.id ? (
                      <Loader2 aria-hidden="true" className="animate-spin" />
                    ) : (
                      <Trash2 aria-hidden="true" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
