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
import { Input } from "@/components/ui/input"
import type { BidLineInput } from "@/app/reconciliation/actions"

export type BidLineFormValue = BidLineInput & { id?: string }

const EMPTY_VALUE: BidLineFormValue = {
  itemNumber: "",
  description: "",
  unit: "",
  officialQuantity: "",
  specSection: "",
}

export function BidLineDialog({
  open,
  onOpenChange,
  initialValue,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Omit to add a new line; pass an existing line's values to edit it. */
  initialValue?: BidLineFormValue
  onSave: (value: BidLineFormValue) => void
}) {
  const [value, setValue] = React.useState<BidLineFormValue>(EMPTY_VALUE)
  const [prevOpen, setPrevOpen] = React.useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setValue(initialValue ?? EMPTY_VALUE)
  }

  const isValid =
    value.itemNumber.trim() !== "" &&
    value.description.trim() !== "" &&
    value.unit.trim() !== "" &&
    value.officialQuantity.trim() !== "" &&
    !Number.isNaN(Number(value.officialQuantity))

  function handleSave() {
    if (!isValid) return
    onSave({
      ...value,
      itemNumber: value.itemNumber.trim(),
      description: value.description.trim(),
      unit: value.unit.trim(),
      officialQuantity: value.officialQuantity.trim(),
      specSection: value.specSection?.trim() || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initialValue ? "Edit bid item" : "Add bid item"}</DialogTitle>
          <DialogDescription>
            Enter this line exactly as it appears on the official bid form.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="bid-item-number">Item #</FieldLabel>
              <Input
                id="bid-item-number"
                value={value.itemNumber}
                onChange={(e) => setValue((v) => ({ ...v, itemNumber: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bid-unit">Unit</FieldLabel>
              <Input
                id="bid-unit"
                placeholder="CY, TON, LF, EA, LS…"
                value={value.unit}
                onChange={(e) => setValue((v) => ({ ...v, unit: e.target.value }))}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="bid-description">Description</FieldLabel>
            <Input
              id="bid-description"
              value={value.description}
              onChange={(e) => setValue((v) => ({ ...v, description: e.target.value }))}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="bid-quantity">Official quantity</FieldLabel>
              <Input
                id="bid-quantity"
                type="number"
                step="0.01"
                inputMode="decimal"
                className="tabular-nums"
                value={value.officialQuantity}
                onChange={(e) =>
                  setValue((v) => ({ ...v, officialQuantity: e.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bid-spec">Spec section</FieldLabel>
              <Input
                id="bid-spec"
                placeholder="Optional"
                value={value.specSection ?? ""}
                onChange={(e) => setValue((v) => ({ ...v, specSection: e.target.value }))}
              />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button onClick={handleSave} disabled={!isValid}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
