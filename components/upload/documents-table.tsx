"use client"

import { Check, X } from "lucide-react"

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
  | "Supporting Document"

export const docTypeOptions: DocType[] = [
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
  status: "uploaded" | "uploading"
  progress?: number
}

export function DocumentsTable({
  docs,
  onTypeChange,
  onRemove,
}: {
  docs: UploadDoc[]
  onTypeChange: (id: string, type: DocType) => void
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
                <Select
                  value={doc.type}
                  onValueChange={(value) => onTypeChange(doc.id, value as DocType)}
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
              </TableCell>
              <TableCell className="text-muted-foreground">{doc.pages}</TableCell>
              <TableCell className="text-muted-foreground">{doc.size}</TableCell>
              <TableCell>
                {doc.status === "uploaded" ? (
                  <span className="flex items-center gap-1.5 text-success">
                    <Check className="size-4" />
                    <span className="text-sm font-medium">Uploaded</span>
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
