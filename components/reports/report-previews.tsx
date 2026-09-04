import { ImageOff } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { EstimateLineView } from "@/lib/estimate-view"
import type { ReconciliationRowView } from "@/lib/reconciliation-view"
import {
  reportStatusClasses,
  reports,
  type ReportId,
} from "@/lib/report-data"
import {
  costKindTable,
  detailedEstimateTable,
  proposalTable,
  quantitySummaryTable,
} from "@/lib/report-tables"
import {
  DisclosureBlock,
  ProvenanceLegend,
} from "@/components/reports/report-shared"

export type ReportOptions = {
  sourceReferences: boolean
  provenanceLegend: boolean
}

export type ReportContext = {
  orgName: string
  projectName: string
  projectNumber: string
  bidDate: string
  preparedDate: string
}

function PaperHeader({
  title,
  context,
}: {
  title: string
  context: ReportContext
}) {
  return (
    <div className="border-b border-border pb-4">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {context.projectName} (#{context.projectNumber}) · Bid Date{" "}
        {context.bidDate} · Prepared {context.preparedDate}
      </p>
    </div>
  )
}

export function ReconciliationReport({
  context,
  rows,
  bidTotal,
  reviewedCount,
  overriddenCount,
  options,
}: {
  context: ReportContext
  rows: ReconciliationRowView[]
  bidTotal: string
  reviewedCount: number
  overriddenCount: number
  options: ReportOptions
}) {
  return (
    <div className="flex flex-col">
      <PaperHeader
        title={`${context.orgName} · Bid Form Reconciliation Report`}
        context={context}
      />

      <div className="flex flex-wrap gap-x-6 gap-y-1 py-4 text-sm">
        <span className="font-medium text-foreground">
          Bid Total <span className="tabular-nums">{bidTotal}</span>
        </span>
        <span className="text-muted-foreground">
          {rows.length}/{rows.length} items reconciled
        </span>
        <span className="text-muted-foreground">
          {reviewedCount} items human-reviewed
        </span>
        <span className="text-muted-foreground">
          {overriddenCount} override{overriddenCount === 1 ? "" : "s"} on file
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-14">Unit</TableHead>
            <TableHead className="text-right">Official</TableHead>
            <TableHead className="text-right">Estimate</TableHead>
            {options.sourceReferences ? (
              <TableHead>Status</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-muted-foreground tabular-nums">
                {row.itemNumber}
              </TableCell>
              <TableCell className="font-medium">{row.description}</TableCell>
              <TableCell className="text-muted-foreground">{row.unit}</TableCell>
              <TableCell className="text-right tabular-nums">
                {row.officialQty}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.estimateQty}
              </TableCell>
              {options.sourceReferences ? (
                <TableCell className="whitespace-normal">
                  <Badge
                    className={cn(
                      "h-auto items-start whitespace-normal py-1 text-left leading-tight",
                      reportStatusClasses[row.statusColor],
                    )}
                  >
                    {row.statusLabel}
                  </Badge>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {options.provenanceLegend ? (
        <div className="mt-6">
          <ProvenanceLegend />
        </div>
      ) : null}

      <DisclosureBlock />
    </div>
  )
}

export function EstimateSummaryReport({
  context,
  rows,
  subtotal,
  markup,
  bidTotal,
  options,
}: {
  context: ReportContext
  rows: EstimateLineView[]
  subtotal: string
  markup: string
  bidTotal: string
  options: ReportOptions
}) {
  return (
    <div className="flex flex-col">
      <PaperHeader
        title={`${context.orgName} · Estimate Summary`}
        context={context}
      />

      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="w-14">Unit</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.id}>
              <TableCell className="text-muted-foreground tabular-nums">
                {index + 1}
              </TableCell>
              <TableCell className="font-medium">{row.description}</TableCell>
              <TableCell className="text-right tabular-nums">{row.qty}</TableCell>
              <TableCell className="text-muted-foreground">{row.unit}</TableCell>
              <TableCell className="text-right tabular-nums">
                {row.unitPrice}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.total}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-4 flex flex-col items-end gap-1 border-t border-border pt-4 text-sm">
        <div className="flex w-64 justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums">{subtotal}</span>
        </div>
        <div className="flex w-64 justify-between">
          <span className="text-muted-foreground">Markup</span>
          <span className="tabular-nums">{markup}</span>
        </div>
        <div className="flex w-64 justify-between border-t border-border pt-1 font-semibold">
          <span>Bid Total</span>
          <span className="tabular-nums">{bidTotal}</span>
        </div>
      </div>

      {options.provenanceLegend ? (
        <div className="mt-6">
          <ProvenanceLegend />
        </div>
      ) : null}

      <DisclosureBlock />
    </div>
  )
}

function SimpleTableReport({
  title,
  context,
  table,
  options,
  empty,
}: {
  title: string
  context: ReportContext
  table: { headers: string[]; body: string[][]; totals?: Array<[string, string]> }
  options: ReportOptions
  empty: string
}) {
  return (
    <div className="flex flex-col">
      <PaperHeader title={`${context.orgName} · ${title}`} context={context} />
      {table.body.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              {table.headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.body.map((cells, index) => (
              <TableRow key={`${cells[0]}-${index}`}>
                {cells.map((cell, cellIndex) => (
                  <TableCell
                    key={table.headers[cellIndex]}
                    className={cellIndex === 0 ? "font-medium" : "tabular-nums"}
                  >
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {table.totals?.length ? (
        <div className="mt-4 flex flex-col items-end gap-1 border-t border-border pt-4 text-sm">
          {table.totals.map(([label, value]) => (
            <div key={label} className="flex w-64 justify-between font-semibold">
              <span>{label}</span>
              <span className="tabular-nums">{value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {options.provenanceLegend ? (
        <div className="mt-6">
          <ProvenanceLegend />
        </div>
      ) : null}
      <DisclosureBlock />
    </div>
  )
}

export function DetailedEstimateReport({
  context,
  rows,
  options,
}: {
  context: ReportContext
  rows: EstimateLineView[]
  options: ReportOptions
}) {
  return (
    <SimpleTableReport
      title="Detailed Estimate"
      context={context}
      table={detailedEstimateTable(rows)}
      options={options}
      empty="No estimate lines yet."
    />
  )
}

export function QuantitySummaryReport({
  context,
  rows,
  options,
}: {
  context: ReportContext
  rows: EstimateLineView[]
  options: ReportOptions
}) {
  return (
    <SimpleTableReport
      title="Quantity Summary"
      context={context}
      table={quantitySummaryTable(rows)}
      options={options}
      empty="No quantities to summarize yet."
    />
  )
}

export function CostKindReport({
  context,
  rows,
  kind,
  options,
}: {
  context: ReportContext
  rows: EstimateLineView[]
  kind: "labor" | "material" | "equip"
  options: ReportOptions
}) {
  const title =
    kind === "labor" ? "Labor Summary" : kind === "material" ? "Material Summary" : "Equipment Summary"
  return (
    <SimpleTableReport
      title={title}
      context={context}
      table={costKindTable(rows, kind)}
      options={options}
      empty={`No ${kind === "equip" ? "equipment" : kind} costs entered on estimate lines yet.`}
    />
  )
}

export function ProposalSummaryReport({
  context,
  rows,
  subtotal,
  markup,
  bidTotal,
  options,
}: {
  context: ReportContext
  rows: EstimateLineView[]
  subtotal: string
  markup: string
  bidTotal: string
  options: ReportOptions
}) {
  const table = proposalTable(rows)
  return (
    <SimpleTableReport
      title="Proposal Summary"
      context={context}
      table={{
        ...table,
        totals: [
          ["Subtotal", subtotal],
          ["Markup", markup],
          ["Bid Total", bidTotal],
        ],
      }}
      options={options}
      empty="No proposal items yet."
    />
  )
}

export function PlaceholderReport({ reportId }: { reportId: ReportId }) {
  const report = reports.find((r) => r.id === reportId)
  return (
    <div className="flex min-h-96 flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-border bg-muted/40 p-10 text-center">
      <ImageOff className="size-8 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{report?.name}</p>
      <p className="text-sm text-muted-foreground">
        Preview available in full version
      </p>
    </div>
  )
}
