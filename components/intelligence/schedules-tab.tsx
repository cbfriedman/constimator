"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Download, FileSearch } from "lucide-react"

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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { SourceChip } from "@/components/intelligence/source-reference"
import { cn } from "@/lib/utils"
import type { ExtractedItemView } from "@/app/intelligence/actions"

function toCsv(items: ExtractedItemView[]): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const header = ["Trade", "Description", "Quantity", "Unit", "Confidence", "Source Sheets", "Document"]
  const rows = items.map((item) => [
    item.trade,
    item.description,
    String(item.quantity),
    item.unit,
    item.confidence != null ? `${item.confidence}%` : "",
    item.sourceSheets ?? "",
    item.documentName,
  ])
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n")
}

function downloadCsv(items: ExtractedItemView[]) {
  const blob = new Blob([toCsv(items)], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "extracted-items.csv"
  link.click()
  URL.revokeObjectURL(url)
}

export function SchedulesTab({ items }: { items: ExtractedItemView[] }) {
  const router = useRouter()
  const [tradeFilter, setTradeFilter] = React.useState<string | null>(null)

  const trades = React.useMemo(
    () => [...new Set(items.map((item) => item.trade))].sort(),
    [items],
  )
  const filteredItems = tradeFilter
    ? items.filter((item) => item.trade === tradeFilter)
    : items
  // Zero-quantity items are Claude explaining why nothing could be
  // extracted (a mismatched upload, a non-plan document) rather than a
  // real bid item — see worker/src/extract.ts.
  const realItems = filteredItems.filter((item) => item.quantity > 0)
  const notices = filteredItems.filter((item) => item.quantity === 0 && item.notes)

  if (items.length === 0) {
    return (
      <Empty className="border py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileSearch />
          </EmptyMedia>
          <EmptyTitle>No extracted items yet</EmptyTitle>
          <EmptyDescription>
            Upload documents and wait for AI processing to finish — extracted
            quantities will show up here automatically.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {trades.length > 1 ? (
        <aside className="lg:w-56 lg:shrink-0">
          <div className="rounded-lg border bg-card">
            <div className="border-b px-3 py-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Trade
              </h2>
            </div>
            <nav className="flex flex-col p-1.5">
              <button
                type="button"
                onClick={() => setTradeFilter(null)}
                className={cn(
                  "rounded-md px-3 py-2 text-left text-sm transition-colors",
                  tradeFilter === null
                    ? "bg-primary/10 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                All trades
              </button>
              {trades.map((trade) => (
                <button
                  key={trade}
                  type="button"
                  onClick={() => setTradeFilter(trade)}
                  className={cn(
                    "rounded-md px-3 py-2 text-left text-sm transition-colors",
                    tradeFilter === trade
                      ? "bg-primary/10 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {trade}
                </button>
              ))}
            </nav>
          </div>
        </aside>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="rounded-lg border bg-card">
          <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold">
                {tradeFilter ?? "Extracted Items"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {realItems.length} item{realItems.length === 1 ? "" : "s"} extracted
                {realItems.length > 0
                  ? " — already reflected in your estimate"
                  : ""}
              </p>
            </div>
            {realItems.length > 0 ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCsv(realItems)}
                >
                  <Download data-icon="inline-start" />
                  Download CSV
                </Button>
                <Button size="sm" onClick={() => router.push("/estimate")}>
                  Open Estimate
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            ) : null}
          </div>

          <div className="p-1">
            {realItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trade</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-20">Unit</TableHead>
                    <TableHead className="w-28 text-right">Quantity</TableHead>
                    <TableHead className="w-24">Confidence</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {realItems.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{item.trade}</TableCell>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.quantity.toLocaleString("en-US")}
                      </TableCell>
                      <TableCell>
                        {item.confidence != null ? (
                          <Badge variant="outline">{item.confidence}%</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.sourceSheets ? (
                          <SourceChip label={item.sourceSheets} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col gap-3 px-4 py-8">
                {notices.map((notice, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {notice.documentName}:
                    </span>{" "}
                    {notice.notes}
                  </p>
                ))}
                {notices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No quantities were extracted from this document.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
