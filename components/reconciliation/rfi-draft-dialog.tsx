"use client"

import * as React from "react"
import { Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { draftSheetRfi } from "@/lib/rfi-draft"
import type { SheetMatrixCell } from "@/lib/sheet-matrix"

// The draft is editable in place: the template gets the citation right,
// the contractor gets the tone right. Nothing is stored — an RFI lives in
// the contractor's own correspondence with the agency, not here — so the
// only output is the clipboard.
export function RfiDraftDialog({
  cell,
  open,
  onOpenChange,
  onCopied,
}: {
  cell: SheetMatrixCell | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCopied?: (cell: SheetMatrixCell) => void
}) {
  const [title, setTitle] = React.useState("")
  const [body, setBody] = React.useState("")
  const [prevCell, setPrevCell] = React.useState<SheetMatrixCell | null>(null)

  if (cell !== prevCell) {
    setPrevCell(cell)
    if (cell) {
      const draft = draftSheetRfi(cell)
      setTitle(draft.title)
      setBody(draft.body)
    }
  }

  async function handleCopy() {
    if (!cell) return
    try {
      await navigator.clipboard.writeText(`${title}\n\n${body}`)
      toast.success("RFI copied to clipboard")
      onCopied?.(cell)
      onOpenChange(false)
    } catch {
      toast.error("Couldn't copy — select the text and copy it manually.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Draft RFI</DialogTitle>
          <DialogDescription>
            {cell
              ? `Sheet ${cell.sheetNumber} vs. the official bid form. Edit the wording, then copy it into your RFI.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="rfi-title">Subject</FieldLabel>
            <Input id="rfi-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="rfi-body">Request</FieldLabel>
            <Textarea
              id="rfi-body"
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Close</Button>} />
          <Button onClick={handleCopy}>
            <Copy data-icon="inline-start" />
            Copy RFI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
