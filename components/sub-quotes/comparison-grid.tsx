"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowDownUp, CircleAlert, Copy, FileDown, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import type { TradeSummary } from "@/app/sub-quotes/actions"
import { ComparisonGridCell } from "@/components/sub-quotes/comparison-cell"
import { ProjectHeader } from "@/components/project-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  countUnverified,
  exportComparisonExcel,
  exportComparisonPdf,
} from "@/lib/comparison-export"
import { VERIFICATION_DISCLAIMER, unverifiedNotice } from "@/lib/export-disclaimer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  type ComparisonGrid,
  alignRowsToColumns,
  sortColumns,
} from "@/lib/quote-comparison"
import { cn } from "@/lib/utils"

type SortBy = "base" | "adjusted"

export function ComparisonGridView({
  projectName,
  projectNumber,
  orgName,
  trades,
  grid,
}: {
  projectName: string
  projectNumber: string
  orgName: string
  trades: TradeSummary[]
  grid: ComparisonGrid
}) {
  const router = useRouter()
  const [sortBy, setSortBy] = React.useState<SortBy>("adjusted")

  const { unverified, total } = React.useMemo(() => countUnverified(grid), [grid])
  const notice = unverifiedNotice(unverified, total)

  function handleExport(format: "pdf" | "xlsx") {
    const context = {
      orgName,
      projectName,
      projectNumber,
      preparedDate: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    }
    const slug = grid.trade.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    const name = `quote_comparison_${slug || "trade"}_${projectNumber}.${format}`

    try {
      if (format === "pdf") exportComparisonPdf(context, grid, name)
      else exportComparisonExcel(context, grid, name)
      toast.success(`${name} downloaded`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate that file.")
    }
  }

  const columns = React.useMemo(() => sortColumns(grid.columns, sortBy), [grid.columns, sortBy])
  const rows = React.useMemo(() => alignRowsToColumns(grid.rows, columns), [grid.rows, columns])

  const refresh = React.useCallback(() => router.refresh(), [router])

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <ProjectHeader
          title={`${grid.trade} — quote comparison`}
          subtitle={`${grid.columns.length} ${grid.columns.length === 1 ? "quote" : "quotes"} · ${projectName}`}
        />
        <div className="flex flex-wrap items-center gap-3">
          {trades.length > 1 ? (
            <Select
              value={grid.trade}
              onValueChange={(trade) =>
                router.push(`/sub-quotes/compare?trade=${encodeURIComponent(trade ?? grid.trade)}`)
              }
            >
              <SelectTrigger className="w-52" aria-label="Choose a trade">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {trades.map((trade) => (
                  <SelectItem key={trade.trade} value={trade.trade}>
                    {trade.trade} ({trade.quoteCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <ToggleGroup
            value={[sortBy]}
            onValueChange={(value) => {
              const next = value[0]
              if (next === "base" || next === "adjusted") setSortBy(next)
            }}
            aria-label="Sort quotes by"
          >
            <ToggleGroupItem value="base">
              <ArrowDownUp data-icon="inline-start" />
              Base price
            </ToggleGroupItem>
            <ToggleGroupItem value="adjusted">Adjusted price</ToggleGroupItem>
          </ToggleGroup>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
              <FileDown data-icon="inline-start" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")}>
              <FileDown data-icon="inline-start" />
              Excel
            </Button>
          </div>
        </div>
      </div>

      {grid.columns.length < 2 ? (
        <p className="text-sm text-muted-foreground">
          Only one quote for this trade so far. Upload another to compare them side by side.
        </p>
      ) : null}

      {/* Shown before the grid, not only inside the file: someone about to
          export should know what state the data is in first. */}
      {notice ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive bg-card p-3">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-foreground">
            <span className="font-medium">
              {unverified} of {total} {unverified === 1 ? "item has" : "items have"} not been
              confirmed against the original quotes.
            </span>{" "}
            Anything exported now carries that warning on its face.{" "}
            <Link href="/sub-quotes" className="underline underline-offset-2">
              Confirm them first
            </Link>
            .
          </p>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] border-collapse">
          <caption className="sr-only">
            {grid.trade} quotes compared condition by condition, sorted by{" "}
            {sortBy === "base" ? "base" : "adjusted"} price
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-52 bg-muted p-3 text-left align-bottom">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Condition
                </span>
              </th>
              {columns.map((column) => (
                <th key={column.subQuoteId} scope="col" className="min-w-52 bg-muted p-3 text-left align-bottom">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-foreground">{column.subName}</span>
                    {column.unverifiedCount > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        {column.unverifiedCount} unverified
                      </span>
                    ) : (
                      <span className="text-xs text-success">All confirmed</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>

            <PriceRow
              label="Base price"
              hint="As quoted"
              columns={columns}
              valueOf={(column) => column.basePriceUsd}
              rankOf={(column) => column.baseRank}
              highlightWinner={sortBy === "base"}
            />
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.category}
                className={cn(
                  "border-t border-border",
                  // Where the subs disagree is where the money is, so those
                  // rows carry the emphasis rather than every row being loud.
                  row.subsDiffer ? "bg-card" : "bg-muted",
                )}
              >
                <th scope="row" className="p-3 text-left align-top">
                  <div className="flex flex-col items-start gap-1.5">
                    <span className="text-sm font-medium text-foreground">{row.label}</span>
                    {row.flags.includes("gap") ? (
                      <Badge variant="outline" className="border-destructive text-destructive">
                        <TriangleAlert aria-hidden="true" />
                        Gap — nobody covered it
                      </Badge>
                    ) : null}
                    {row.flags.includes("overlap") ? (
                      <Badge variant="outline" className="border-warning text-warning-foreground">
                        <Copy aria-hidden="true" />
                        Overlap — two subs both carry it
                      </Badge>
                    ) : null}
                    {!row.comparable ? (
                      <span
                        className="text-xs text-muted-foreground"
                        title="Each sub's items here describe different scope, so they can't be checked for gaps or overlaps automatically"
                      >
                        Compare by eye
                      </span>
                    ) : null}
                  </div>
                </th>
                {row.cells.map((cell) => (
                  <ComparisonGridCell
                    key={`${row.category}-${cell.subQuoteId}`}
                    cell={cell}
                    onCostChanged={refresh}
                  />
                ))}
              </tr>
            ))}
          </tbody>

          <tfoot>
            <PriceRow
              label="Adjusted price"
              hint="Base + your cost to cover each exclusion"
              columns={columns}
              valueOf={(column) => column.adjustedPriceUsd}
              rankOf={(column) => column.adjustedRank}
              highlightWinner={sortBy === "adjusted"}
              showProvisional
            />
          </tfoot>
        </table>
      </div>

      <Legend />

      {/* The same sentence every exported file carries, and the same one
          Section 6 of the Terms renders — all three read from one constant. */}
      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        {VERIFICATION_DISCLAIMER}
      </p>
    </div>
  )
}

function PriceRow({
  label,
  hint,
  columns,
  valueOf,
  rankOf,
  highlightWinner,
  showProvisional = false,
}: {
  label: string
  hint: string
  columns: ComparisonGrid["columns"]
  valueOf: (column: ComparisonGrid["columns"][number]) => number | null
  rankOf: (column: ComparisonGrid["columns"][number]) => number | null
  highlightWinner: boolean
  showProvisional?: boolean
}) {
  return (
    <tr className="border-t border-border bg-muted">
      <th scope="row" className="p-3 text-left align-top">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">{label}</span>
          <span className="text-xs font-normal text-muted-foreground">{hint}</span>
        </div>
      </th>
      {columns.map((column) => {
        const value = valueOf(column)
        const rank = rankOf(column)
        const isLowest = highlightWinner && rank === 1
        const provisional = showProvisional && column.uncostedExclusions > 0

        return (
          <td key={column.subQuoteId} className="p-3 align-top">
            <div className="flex flex-col gap-0.5">
              <span
                className={cn(
                  "text-sm tabular-nums",
                  isLowest ? "font-semibold text-success" : "text-foreground",
                )}
              >
                {value == null
                  ? "No total stated"
                  : value.toLocaleString("en-US", { style: "currency", currency: "USD" })}
              </span>
              {isLowest ? (
                <span className="text-xs font-medium text-success">Lowest</span>
              ) : null}
              {provisional ? (
                <span className="inline-flex items-center gap-1 text-xs text-warning-foreground">
                  <CircleAlert className="size-3 text-warning" aria-hidden="true" />
                  {column.uncostedExclusions} exclusion
                  {column.uncostedExclusions === 1 ? "" : "s"} not costed yet
                </span>
              ) : null}
            </div>
          </td>
        )
      })}
    </tr>
  )
}

function Legend() {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <span className="size-3 rounded-xs border border-success" aria-hidden="true" />
        <dt className="font-medium text-foreground">Included</dt>
        <dd>the sub says they carry it</dd>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-3 rounded-xs border border-destructive" aria-hidden="true" />
        <dt className="font-medium text-foreground">Excluded</dt>
        <dd>the sub says they don&apos;t</dd>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-3 rounded-xs border border-dashed border-border" aria-hidden="true" />
        <dt className="font-medium text-foreground">Not stated</dt>
        <dd>the quote is silent — not the same as excluded</dd>
      </div>
    </dl>
  )
}
