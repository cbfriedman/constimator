"use client"

import { Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConfidenceCell } from "@/components/reconciliation/confidence-cell"
import { cn } from "@/lib/utils"
import { type ReconRow, statusColorClasses } from "@/lib/reconciliation-data"

export function ReconTable({
  rows,
  onRowClick,
  onAddItem15,
}: {
  rows: ReconRow[]
  onRowClick: (row: ReconRow) => void
  onAddItem15: () => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-10 text-right">#</TableHead>
            <TableHead className="min-w-52">Description</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead className="text-right">Official Qty</TableHead>
            <TableHead className="text-right">AI Qty</TableHead>
            <TableHead className="text-right">Estimate Qty</TableHead>
            <TableHead className="text-right">Diff</TableHead>
            <TableHead className="text-right">% Diff</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Plan Sheets</TableHead>
            <TableHead>Spec</TableHead>
            <TableHead className="min-w-44">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isMissing = row.statusColor === "red"
            const diffColor =
              row.statusColor === "amber"
                ? "text-warning"
                : "text-muted-foreground"

            return (
              <TableRow
                key={row.id}
                onClick={() => onRowClick(row)}
                className={cn(
                  "cursor-pointer",
                  isMissing && "bg-destructive/5 hover:bg-destructive/10",
                )}
              >
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {row.id}
                </TableCell>
                <TableCell
                  className={cn("font-medium", isMissing && "font-semibold")}
                >
                  {row.description}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.unit}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.officialQty}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.aiQty}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    row.estimateQty === "—" && "text-muted-foreground",
                  )}
                >
                  {row.estimateQty}
                </TableCell>
                <TableCell
                  className={cn("text-right tabular-nums", diffColor)}
                >
                  {row.diff}
                </TableCell>
                <TableCell
                  className={cn("text-right tabular-nums", diffColor)}
                >
                  {row.pctDiff}
                </TableCell>
                <TableCell>
                  <ConfidenceCell value={row.confidence} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {row.planSheets}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {row.spec}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-auto whitespace-normal py-1 text-left font-medium leading-tight",
                        statusColorClasses[row.statusColor],
                      )}
                    >
                      {row.statusLabel}
                    </Badge>
                    {row.addable ? (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAddItem15()
                        }}
                      >
                        <Plus data-icon="inline-start" />
                        Add Item 15 to Estimate
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
