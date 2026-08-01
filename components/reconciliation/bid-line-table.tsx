"use client"

import * as React from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BidLineDialog,
  type BidLineFormValue,
} from "@/components/reconciliation/bid-line-dialog"
import {
  addBidLineAction,
  deleteBidLineAction,
  updateBidLineAction,
} from "@/app/reconciliation/actions"
import type { bids } from "@/db/schema"

type BidRow = typeof bids.$inferSelect

export function BidLineTable({
  projectId,
  initialBidRows,
  onChanged,
}: {
  projectId: string
  initialBidRows: BidRow[]
  /** Called after any add/edit/delete so the parent can re-run the diff. */
  onChanged: () => void
}) {
  const [bidRows, setBidRows] = React.useState<BidRow[]>(initialBidRows)
  const [prevInitialBidRows, setPrevInitialBidRows] = React.useState(initialBidRows)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<BidLineFormValue | undefined>(undefined)

  if (initialBidRows !== prevInitialBidRows) {
    setPrevInitialBidRows(initialBidRows)
    setBidRows(initialBidRows)
  }

  function openAdd() {
    setEditing(undefined)
    setDialogOpen(true)
  }

  function openEdit(row: BidRow) {
    setEditing({
      id: row.id,
      itemNumber: row.itemNumber,
      description: row.description,
      unit: row.unit,
      officialQuantity: row.officialQuantity,
      specSection: row.specSection,
    })
    setDialogOpen(true)
  }

  async function handleSave(value: BidLineFormValue) {
    setDialogOpen(false)
    if (value.id) {
      const updated = await updateBidLineAction(value.id, value)
      if (updated) {
        setBidRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
      }
    } else {
      const created = await addBidLineAction(projectId, value)
      if (created) {
        setBidRows((prev) => [...prev, created])
      }
    }
    onChanged()
  }

  async function handleDelete(id: string) {
    setBidRows((prev) => prev.filter((row) => row.id !== id))
    await deleteBidLineAction(id)
    onChanged()
  }

  return (
    <div className="flex flex-col gap-3">
      {bidRows.length > 0 ? (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Item #</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Official Qty</TableHead>
                <TableHead>Spec</TableHead>
                <TableHead className="w-0 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bidRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="tabular-nums">{row.itemNumber}</TableCell>
                  <TableCell className="font-medium">{row.description}</TableCell>
                  <TableCell className="text-muted-foreground">{row.unit}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.officialQuantity}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.specSection ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(row)}
                        aria-label={`Edit ${row.description}`}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(row.id)}
                        aria-label={`Remove ${row.description}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <Button variant="outline" size="sm" className="w-fit" onClick={openAdd}>
        <Plus data-icon="inline-start" />
        Add Bid Item
      </Button>

      <BidLineDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialValue={editing}
        onSave={handleSave}
      />
    </div>
  )
}
