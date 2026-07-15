"use client"

import * as React from "react"
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { SourceBadge, type SourceKind } from "@/components/source-badge"
import { CostBreakdown } from "@/components/estimate/cost-breakdown"
import { estimateRows } from "@/lib/estimate-data"
import { useProjectState } from "@/components/project-state-provider"
import { cn } from "@/lib/utils"

const costWarnings: Record<number, string> = {
  8: "Crew uses Water Truck — rate not set",
  15: "Uses Cement Mason — labor rate not set",
}

export function EstimateTable() {
  const { costSetupComplete } = useProjectState()
  const [expanded, setExpanded] = React.useState<number | null>(null)
  const [overrides, setOverrides] = React.useState<Record<number, SourceKind>>(
    {},
  )
  const [overrideDialog, setOverrideDialog] = React.useState<{
    id: number
    qty: string
    unit: string
  } | null>(null)
  const [note, setNote] = React.useState("")
  const [noteError, setNoteError] = React.useState(false)

  function toggleRow(id: number) {
    setExpanded((current) => (current === id ? null : id))
  }

  function confirmOverride() {
    if (!note.trim()) {
      setNoteError(true)
      return
    }
    if (overrideDialog) {
      setOverrides((current) => ({
        ...current,
        [overrideDialog.id]: "overridden",
      }))
    }
    closeOverrideDialog()
  }

  function closeOverrideDialog() {
    setOverrideDialog(null)
    setNote("")
    setNoteError(false)
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-8" />
              <TableHead className="w-8 text-right">#</TableHead>
              <TableHead className="min-w-56">Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Labor</TableHead>
              <TableHead className="text-right">Material</TableHead>
              <TableHead className="text-right">Equip</TableHead>
              <TableHead className="text-right">Sub</TableHead>
              <TableHead className="text-right">MU%</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {estimateRows.map((row) => {
              const source = overrides[row.id] ?? row.source
              const isExpandable = row.id === 6
              const isOpen = expanded === row.id
              return (
                <React.Fragment key={row.id}>
                  <TableRow
                    className={cn(
                      "align-top",
                      isExpandable && "cursor-pointer",
                      isOpen && "bg-primary/5",
                    )}
                    onClick={isExpandable ? () => toggleRow(row.id) : undefined}
                  >
                    <TableCell className="text-muted-foreground">
                      {isExpandable ? (
                        isOpen ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {row.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                          {row.description}
                          {!costSetupComplete && costWarnings[row.id] ? (
                            <Tooltip>
                              <TooltipTrigger
                                aria-label={costWarnings[row.id]}
                                className="inline-flex text-warning outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <AlertTriangle className="size-4" />
                              </TooltipTrigger>
                              <TooltipContent>
                                {costWarnings[row.id]}
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </span>
                        {row.note ? (
                          <span className="text-xs text-muted-foreground">
                            {row.note}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.qty}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.unit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.unitPrice}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {row.labor}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {row.material}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {row.equip}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {row.sub}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {row.mu}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {row.total}
                    </TableCell>
                    <TableCell>
                      <SourceBadge kind={source} />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Actions for ${row.description}`}
                          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-1 focus-visible:outline-ring"
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuGroup>
                            <DropdownMenuItem>Edit item</DropdownMenuItem>
                            <DropdownMenuItem>Duplicate</DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setOverrideDialog({
                                  id: row.id,
                                  qty: row.qty,
                                  unit: row.unit,
                                })
                              }
                            >
                              Override qty
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {isExpandable && isOpen ? (
                    <TableRow className="bg-primary/5 hover:bg-primary/5">
                      <TableCell colSpan={14} className="p-0">
                        <div className="p-4">
                          <CostBreakdown />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={overrideDialog !== null}
        onOpenChange={(open) => {
          if (!open) closeOverrideDialog()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override official quantity</DialogTitle>
            <DialogDescription>
              {overrideDialog
                ? `You're overriding the official bid form quantity (${overrideDialog.qty} ${overrideDialog.unit}). Add a note so your team knows why.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={noteError || undefined}>
            <FieldLabel htmlFor="override-note">Reason for override</FieldLabel>
            <Textarea
              id="override-note"
              aria-invalid={noteError || undefined}
              placeholder="e.g. Plan sheet C-14 shows 680 LF; bid form appears to omit the north lateral."
              value={note}
              onChange={(e) => {
                setNote(e.target.value)
                if (e.target.value.trim()) setNoteError(false)
              }}
            />
            {noteError ? (
              <p className="text-sm text-destructive">
                A note is required to override an official quantity.
              </p>
            ) : null}
          </Field>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline">Cancel</Button>}
            />
            <Button onClick={confirmOverride}>Confirm override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
