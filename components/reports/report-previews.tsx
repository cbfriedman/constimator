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
  DisclosureBlock,
  ProvenanceLegend,
} from "@/components/reports/report-shared"

export type ReportOptions = {
  sourceReferences: boolean
  provenanceLegend: boolean
  reviewerComments: boolean
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

const reviewerComments = [
  {
    author: "Dan Whitfield, PE",
    item: "Item 8 — 18\" RCP Class III",
    text: "Resolved to 640 LF per official bid form. Inlet connections are paid separately under Item 9.",
  },
  {
    author: "Dan Whitfield, PE",
    item: "Item 12 — Pavement Marking Thermo",
    text: "Low AI confidence confirmed; quantity 1,850 SF verified against C-601 manually.",
  },
]

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
            <TableHead className="text-right">AI</TableHead>
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
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {row.aiQty}
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

      {options.reviewerComments ? (
        <div className="mt-6 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            Reviewer Comments
          </h3>
          {reviewerComments.map((comment) => (
            <div
              key={comment.item}
              className="rounded-md border border-border bg-muted/30 p-3"
            >
              <p className="text-xs font-medium text-foreground">
                {comment.item}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {comment.text}
              </p>
              <p className="mt-1 text-xs italic text-muted-foreground">
                — {comment.author}
              </p>
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
          <span className="text-muted-foreground">Markup (10%)</span>
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
