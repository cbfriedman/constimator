"use client"

import * as React from "react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatQty, type ItemSummary, type SheetMatrixCell } from "@/lib/sheet-matrix"

const NONE = "__none__"

// "Which bid item is this for?" — the one question the matcher won't
// guess at. Offers every bid item, not just those of the same unit: a sheet
// that counts inlets in EA can belong to an item priced in LF, and the
// contractor knows that where the matcher can't.
export function LinkCalloutDialog({
  cell,
  items,
  open,
  onOpenChange,
  onSave,
}: {
  cell: SheetMatrixCell | null
  items: ItemSummary[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (cell: SheetMatrixCell, bidId: string | null) => void
}) {
  const [bidId, setBidId] = React.useState<string>(NONE)
  const [prevCell, setPrevCell] = React.useState<SheetMatrixCell | null>(null)

  if (cell !== prevCell) {
    setPrevCell(cell)
    setBidId(cell?.bidId ?? NONE)
  }

  const label = (id: string | null) => {
    if (!id || id === NONE) return "Not on the bid form"
    const item = items.find((i) => i.bidId === id)
    return item ? `${item.itemNumber} · ${item.description}` : "Bid item"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link to bid item</DialogTitle>
          <DialogDescription>
            {cell
              ? `Sheet ${cell.sheetNumber} states ${formatQty(cell.statedQty)} ${cell.calloutUnit} of "${cell.calloutDescription}".`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel>Official bid item</FieldLabel>
          <Select value={bidId} onValueChange={(value) => setBidId(value ?? NONE)}>
            <SelectTrigger className="w-full">
              <SelectValue>{(value) => label(value as string)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Not on the bid form</SelectItem>
              {items.map((item) => (
                <SelectItem key={item.bidId} value={item.bidId}>
                  {item.itemNumber} · {item.description} ({item.unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button
            onClick={() => {
              if (cell) onSave(cell, bidId === NONE ? null : bidId)
            }}
          >
            Save link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
