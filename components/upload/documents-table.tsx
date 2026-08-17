"use client"

import { AlertTriangle, Check, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type DocType =
  | "Plans"
  | "Specifications"
  | "Addendum"
  | "Official Bid Form"
  | "Sub Quote"
  | "Supporting Document"

// A sub quote can't be created or picked here: it needs the sub's name and
// trade alongside the file (see db/schema.ts's sub_quote), which this general
// project-documents uploader has no fields for, so one uploaded through here
// would be a document with no sub_quote row behind it. Its own screen owns
// that. "Sub Quote" stays in DocType so an existing one still renders with a
// proper label in this table — it just can't be chosen, and this type is what
// carries that distinction into the change handler rather than leaving it as
// a convention someone has to remember.
export type SelectableDocType = Exclude<DocType, "Sub Quote">

export const docTypeOptions: SelectableDocType[] = [
  "Plans",
  "Specifications",
  "Addendum",
  "Official Bid Form",
  "Supporting Document",
]

export type UploadDoc = {
  id: string
  file: string
  type: DocType
  pages: string
  size: string
  status: "uploaded" | "uploading" | "error"
  progress?: number
  errorMessage?: string
}

export function DocumentsTable({
  docs,
  onTypeChange,
  onRemove,
}: {
  docs: UploadDoc[]
  onTypeChange: (id: string, type: SelectableDocType) => void
  onRemove: (id: string) => void
}) {
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[30%]">File</TableHead>
          <TableHead className="w-[24%]">Type</TableHead>
          <TableHead className="w-[14%]">Pages</TableHead>
          <TableHead className="w-[10%]">Size</TableHead>
          <TableHead className="w-[18%]">Status</TableHead>
          <TableHead className="w-[4%]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {docs.map((doc) => {
          const isBidForm = doc.type === "Official Bid Form"
          return (
            <TableRow key={doc.id}>
              <TableCell className="whitespace-normal font-medium">
                {doc.file}
              </TableCell>
              <TableCell>
                {doc.type === "Sub Quote" ? (
                  // Shown as plain text, not a picker. A sub quote's document
                  // has a sub_quote row hanging off it carrying the sub's
                  // name, trade, and extracted conditions; retyping it here
                  // would strand all of that. Managed from the sub quotes
                  // screen instead.
                  <span className="text-sm font-medium">{doc.type}</span>
                ) : (
                  <Select
                    value={doc.type}
                    onValueChange={(value) =>
                      onTypeChange(doc.id, value as SelectableDocType)
                    }
                  >
                    <SelectTrigger
                      className={cn(
                        "w-full",
                        isBidForm &&
                          "border-primary/40 bg-primary/10 font-semibold text-primary",
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {docTypeOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{doc.pages}</TableCell>
              <TableCell className="text-muted-foreground">{doc.size}</TableCell>
              <TableCell>
                {doc.status === "uploaded" ? (
                  <span className="flex items-center gap-1.5 text-success">
                    <Check className="size-4" />
                    <span className="text-sm font-medium">Uploaded</span>
                  </span>
                ) : doc.status === "error" ? (
                  <span
                    className="flex items-center gap-1.5 text-destructive"
                    title={doc.errorMessage}
                  >
                    <AlertTriangle className="size-4 shrink-0" />
                    <span className="text-sm font-medium">
                      {doc.errorMessage ?? "Upload failed"}
                    </span>
                  </span>
                ) : (
                  <div className="flex flex-col gap-1">
                    <Progress value={doc.progress ?? 0} className="h-1.5" />
                    <span className="text-xs text-muted-foreground">
                      Uploading… {doc.progress ?? 0}%
                    </span>
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(doc.id)}
                  aria-label={`Remove ${doc.file}`}
                >
                  <X />
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
