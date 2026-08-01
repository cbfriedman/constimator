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
import type { EstimateLineInput } from "@/app/estimate/actions"

export type EstimateLineFormValue = EstimateLineInput & { id?: string }

const EMPTY_VALUE: EstimateLineFormValue = {
  description: "",
  note: "",
  quantity: "",
  unit: "",
  unitPrice: "",
  laborCost: "",
  materialCost: "",
  equipmentCost: "",
  subCost: "",
  markupPct: "10",
}

function isNumeric(value: string): boolean {
  return value.trim() !== "" && !Number.isNaN(Number(value))
}

function isOptionalNumeric(value: string | null): boolean {
  const v = value ?? ""
  return v.trim() === "" || !Number.isNaN(Number(v))
}

export function EstimateLineDialog({
  open,
  onOpenChange,
  initialValue,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Omit to add a new line; pass an existing line's values to edit it. */
  initialValue?: EstimateLineFormValue
  onSave: (value: EstimateLineFormValue) => void
}) {
  const [value, setValue] = React.useState<EstimateLineFormValue>(EMPTY_VALUE)
  const [prevOpen, setPrevOpen] = React.useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setValue(initialValue ?? EMPTY_VALUE)
  }

  const isValid =
    value.description.trim() !== "" &&
    value.unit.trim() !== "" &&
    isNumeric(value.quantity) &&
    isNumeric(value.unitPrice) &&
    isNumeric(value.markupPct) &&
    isOptionalNumeric(value.laborCost) &&
    isOptionalNumeric(value.materialCost) &&
    isOptionalNumeric(value.equipmentCost) &&
    isOptionalNumeric(value.subCost)

  function handleSave() {
    if (!isValid) return
    onSave({
      ...value,
      description: value.description.trim(),
      unit: value.unit.trim(),
      quantity: value.quantity.trim(),
      unitPrice: value.unitPrice.trim(),
      markupPct: value.markupPct.trim(),
      laborCost: value.laborCost?.trim() || null,
      materialCost: value.materialCost?.trim() || null,
      equipmentCost: value.equipmentCost?.trim() || null,
      subCost: value.subCost?.trim() || null,
      note: value.note?.trim() || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialValue ? "Edit line item" : "Add line item"}</DialogTitle>
          <DialogDescription>
            Enter your own quantity and pricing for this bid item.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="line-description">Description</FieldLabel>
            <Input
              id="line-description"
              value={value.description}
              onChange={(e) => setValue((v) => ({ ...v, description: e.target.value }))}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field>
              <FieldLabel htmlFor="line-quantity">Quantity</FieldLabel>
              <Input
                id="line-quantity"
                type="number"
                step="0.01"
                inputMode="decimal"
                className="tabular-nums"
                value={value.quantity}
                onChange={(e) => setValue((v) => ({ ...v, quantity: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="line-unit">Unit</FieldLabel>
              <Input
                id="line-unit"
                placeholder="CY, TON, LF, EA, LS…"
                value={value.unit}
                onChange={(e) => setValue((v) => ({ ...v, unit: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="line-unit-price">Unit price</FieldLabel>
              <Input
                id="line-unit-price"
                type="number"
                step="0.01"
                inputMode="decimal"
                className="tabular-nums"
                value={value.unitPrice}
                onChange={(e) => setValue((v) => ({ ...v, unitPrice: e.target.value }))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="line-labor">Labor (optional)</FieldLabel>
              <Input
                id="line-labor"
                type="number"
                step="0.01"
                inputMode="decimal"
                className="tabular-nums"
                value={value.laborCost ?? ""}
                onChange={(e) => setValue((v) => ({ ...v, laborCost: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="line-material">Material (optional)</FieldLabel>
              <Input
                id="line-material"
                type="number"
                step="0.01"
                inputMode="decimal"
                className="tabular-nums"
                value={value.materialCost ?? ""}
                onChange={(e) => setValue((v) => ({ ...v, materialCost: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="line-equip">Equipment (optional)</FieldLabel>
              <Input
                id="line-equip"
                type="number"
                step="0.01"
                inputMode="decimal"
                className="tabular-nums"
                value={value.equipmentCost ?? ""}
                onChange={(e) => setValue((v) => ({ ...v, equipmentCost: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="line-sub">Sub (optional)</FieldLabel>
              <Input
                id="line-sub"
                type="number"
                step="0.01"
                inputMode="decimal"
                className="tabular-nums"
                value={value.subCost ?? ""}
                onChange={(e) => setValue((v) => ({ ...v, subCost: e.target.value }))}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="line-markup">Markup %</FieldLabel>
            <Input
              id="line-markup"
              type="number"
              step="0.1"
              inputMode="decimal"
              className="tabular-nums w-32"
              value={value.markupPct}
              onChange={(e) => setValue((v) => ({ ...v, markupPct: e.target.value }))}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="line-note">Note (optional)</FieldLabel>
            <Input
              id="line-note"
              placeholder="e.g. Sub quote: Valley Striping"
              value={value.note ?? ""}
              onChange={(e) => setValue((v) => ({ ...v, note: e.target.value }))}
            />
          </Field>
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
