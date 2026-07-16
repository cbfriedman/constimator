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
import { estimateRows } from "@/lib/estimate-data"
import {
  reportReconRows,
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

function PaperHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-border pb-4">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Shasta County Roadway Improvements (#24-118) · Bid Date Aug 22, 2026 ·
        Prepared Jul 10, 2026
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

export function ReconciliationReport({ options }: { options: ReportOptions }) {
  return (
    <div className="flex flex-col">
      <PaperHeader title="Torres Grading & Paving Inc. · Bid Form Reconciliation Report" />

      <div className="flex flex-wrap gap-x-6 gap-y-1 py-4 text-sm">
        <span className="font-medium text-foreground">
          Bid Total <span className="tabular-nums">$1,916,585</span>
        </span>
        <span className="text-muted-foreground">15/15 items reconciled</span>
        <span className="text-muted-foreground">3 items human-reviewed</span>
        <span className="text-muted-foreground">1 override on file</span>
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
          {reportReconRows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-muted-foreground tabular-nums">
                {row.id}
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

export function EstimateSummaryReport({ options }: { options: ReportOptions }) {
  return (
    <div className="flex flex-col">
      <PaperHeader title="Torres Grading & Paving Inc. · Estimate Summary" />

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
          {estimateRows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-muted-foreground tabular-nums">
                {row.id}
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
          <span className="tabular-nums">$1,742,350</span>
        </div>
        <div className="flex w-64 justify-between">
          <span className="text-muted-foreground">Markup (10%)</span>
          <span className="tabular-nums">$174,235</span>
        </div>
        <div className="flex w-64 justify-between border-t border-border pt-1 font-semibold">
          <span>Bid Total</span>
          <span className="tabular-nums">$1,916,585</span>
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
