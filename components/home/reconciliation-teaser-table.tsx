import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { reconciliationRows, statusColorClasses } from "@/lib/reconciliation-data"
import { cn } from "@/lib/utils"

const previewRowIds = [8, 12, 15]
const previewRows = reconciliationRows.filter((row) =>
  previewRowIds.includes(row.id),
)

export function ReconciliationTeaserTable() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="min-w-40">Bid Item</TableHead>
            <TableHead className="text-right">Official</TableHead>
            <TableHead className="text-right">AI</TableHead>
            <TableHead className="text-right">Estimate</TableHead>
            <TableHead className="min-w-40">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {previewRows.map((row) => (
            <TableRow key={row.id} className="hover:bg-transparent">
              <TableCell>
                <div className="font-medium text-foreground">
                  {row.description}
                </div>
                <div className="text-xs text-muted-foreground">{row.unit}</div>
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
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "h-auto whitespace-normal py-1 text-left leading-tight font-medium",
                    statusColorClasses[row.statusColor],
                  )}
                >
                  {row.statusLabel}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
