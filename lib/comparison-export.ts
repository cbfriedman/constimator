// XLSX and PDF export for the sub-quote comparison grid (step 43).
//
// Runs entirely in the browser, like lib/report-export.ts — the grid is
// already loaded there, so a server round trip would only add latency and a
// second copy of the formatting rules.
//
// The unverified warning is placed on the *face* of both formats — the first
// thing under the title, not a footnote — because the moment an export leaves
// the app it stops being obvious which numbers a human has actually checked.
// A bid tab printed from unconfirmed extraction looks exactly like one printed
// from confirmed extraction unless the file says otherwise.
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

import {
  EXPORT_FOOTER_NOTE,
  VERIFICATION_DISCLAIMER,
  unverifiedNotice,
} from "@/lib/export-disclaimer"
import type { CellStance, ComparisonCell, ComparisonGrid } from "@/lib/quote-comparison"

export type ComparisonExportContext = {
  orgName: string
  projectName: string
  projectNumber: string
  preparedDate: string
}

const STANCE_TEXT: Record<CellStance, string> = {
  included: "Included",
  excluded: "Excluded",
  not_stated: "Not stated",
  value: "Stated",
}

/** Total conditions across the grid, and how many nobody has confirmed. */
export function countUnverified(grid: ComparisonGrid): { unverified: number; total: number } {
  const entries = grid.rows.flatMap((row) => row.cells.flatMap((cell) => cell.entries))
  return {
    unverified: entries.filter((entry) => !entry.isConfirmed).length,
    total: entries.length,
  }
}

/**
 * One cell as text. Keeps the stance word even when there is detail after it:
 * a reader scanning a printed column needs the same in/out signal the coloured
 * grid gave them on screen, and colour does not survive a monochrome printout.
 */
export function cellToText(cell: ComparisonCell): string {
  if (cell.entries.length === 0) return STANCE_TEXT.not_stated

  const detail = cell.entries
    .map((entry) => {
      const unverified = entry.isConfirmed ? "" : " [unverified]"
      const cost =
        entry.stance === "excluded" && entry.primeCostUsd != null
          ? ` (your cost: ${formatUsd(entry.primeCostUsd)})`
          : ""
      return `${entry.detail}${cost}${unverified}`
    })
    .join("; ")

  return `${STANCE_TEXT[cell.stance]} — ${detail}`
}

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

function priceCell(value: number | null, uncosted: number, includeProvisional: boolean): string {
  if (value == null) return "No total stated"
  const base = formatUsd(value)
  if (includeProvisional && uncosted > 0) {
    return `${base} (provisional — ${uncosted} exclusion${uncosted === 1 ? "" : "s"} not costed)`
  }
  return base
}

/** Row labels carry their own flags, so a gap survives export into a spreadsheet someone filters. */
function rowLabel(row: ComparisonGrid["rows"][number]): string {
  const flags: string[] = []
  if (row.flags.includes("gap")) flags.push("GAP — nobody covered")
  if (row.flags.includes("overlap")) flags.push("OVERLAP — two subs carry it")
  return flags.length > 0 ? `${row.label}  [${flags.join("; ")}]` : row.label
}

function triggerDownload(blob: Blob, fileName: string): number {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
  return blob.size
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

export function exportComparisonPdf(
  context: ComparisonExportContext,
  grid: ComparisonGrid,
  fileName: string,
): number {
  // Landscape: a column per sub plus the condition label does not fit portrait
  // once there are three or more quotes, and this grid exists to be compared
  // across, not read down.
  const doc = new jsPDF({ orientation: "landscape" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14

  doc.setFontSize(16)
  doc.text(`${grid.trade} — Quote Comparison`, margin, 16)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`${context.projectName} · #${context.projectNumber}`, margin, 23)
  doc.text(`${context.orgName} · Prepared ${context.preparedDate}`, margin, 28)
  doc.setTextColor(0)

  let cursorY = 34

  const { unverified, total } = countUnverified(grid)
  const notice = unverifiedNotice(unverified, total)
  if (notice) {
    const lines = doc.splitTextToSize(notice, pageWidth - margin * 2)
    const boxHeight = lines.length * 5 + 6
    // Outlined rather than filled, so it survives a black-and-white printer
    // as something other than a grey smudge.
    doc.setDrawColor(180, 30, 20)
    doc.setLineWidth(0.6)
    doc.rect(margin, cursorY, pageWidth - margin * 2, boxHeight)
    doc.setFontSize(9)
    doc.setTextColor(150, 25, 15)
    doc.text(lines, margin + 3, cursorY + 6)
    doc.setTextColor(0)
    doc.setLineWidth(0.2)
    cursorY += boxHeight + 6
  }

  const head = [["Condition", ...grid.columns.map((column) => column.subName)]]

  const body: string[][] = [
    ["BASE PRICE", ...grid.columns.map((column) => priceCell(column.basePriceUsd, 0, false))],
    ...grid.rows.map((row) => [rowLabel(row), ...row.cells.map(cellToText)]),
    [
      "ADJUSTED PRICE",
      ...grid.columns.map((column) =>
        priceCell(column.adjustedPriceUsd, column.uncostedExclusions, true),
      ),
    ],
    [
      "Unverified items",
      ...grid.columns.map((column) =>
        column.unverifiedCount > 0 ? `${column.unverifiedCount} unverified` : "All confirmed",
      ),
    ],
  ]

  autoTable(doc, {
    startY: cursorY,
    head,
    body,
    styles: { fontSize: 7, cellPadding: 2, valign: "top" },
    headStyles: { fillColor: [234, 88, 12] },
    columnStyles: { 0: { cellWidth: 46, fontStyle: "bold" } },
    // Base price, adjusted price and the unverified tally are summary rows,
    // not conditions — shading separates them from the body they bracket.
    didParseCell: (data) => {
      if (data.section !== "body") return
      const isSummary =
        data.row.index === 0 ||
        data.row.index === body.length - 1 ||
        data.row.index === body.length - 2
      if (isSummary) {
        data.cell.styles.fillColor = [243, 244, 246]
        data.cell.styles.fontStyle = "bold"
      }
    },
  })

  // Disclaimer on every page — an exported grid gets split up, forwarded, and
  // printed a page at a time, so it can't live only on the last one.
  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.setFontSize(7)
    doc.setTextColor(90)
    const lines = doc.splitTextToSize(VERIFICATION_DISCLAIMER, pageWidth - margin * 2)
    doc.text(lines, margin, pageHeight - 12)
    doc.text(`${EXPORT_FOOTER_NOTE}   Page ${page} of ${pageCount}`, margin, pageHeight - 5)
    doc.setTextColor(0)
  }

  return triggerDownload(doc.output("blob"), fileName)
}

// ---------------------------------------------------------------------------
// XLSX
// ---------------------------------------------------------------------------

export function exportComparisonExcel(
  context: ComparisonExportContext,
  grid: ComparisonGrid,
  fileName: string,
): number {
  const { unverified, total } = countUnverified(grid)
  const notice = unverifiedNotice(unverified, total)

  const rows: (string | number | null)[][] = [
    [`${grid.trade} — Quote Comparison`],
    [`${context.projectName} · #${context.projectNumber}`],
    [`${context.orgName} · Prepared ${context.preparedDate}`],
  ]

  // Above the data, not below it: a spreadsheet gets sorted and filtered, and
  // anything under the table is the first thing to be lost.
  if (notice) rows.push([], [notice])

  rows.push(
    [],
    ["Condition", ...grid.columns.map((column) => column.subName)],
    ["BASE PRICE", ...grid.columns.map((column) => column.basePriceUsd ?? "No total stated")],
    ...grid.rows.map((row) => [rowLabel(row), ...row.cells.map(cellToText)]),
    [
      "ADJUSTED PRICE",
      ...grid.columns.map((column) => column.adjustedPriceUsd ?? "No total stated"),
    ],
    [
      "Uncosted exclusions",
      ...grid.columns.map((column) => column.uncostedExclusions),
    ],
    [
      "Unverified items",
      ...grid.columns.map((column) => column.unverifiedCount),
    ],
    [],
    [VERIFICATION_DISCLAIMER],
    [EXPORT_FOOTER_NOTE],
  )

  const sheet = XLSX.utils.aoa_to_sheet(rows)
  sheet["!cols"] = [
    { wch: 34 },
    ...grid.columns.map(() => ({ wch: 38 })),
  ]

  const workbook = XLSX.utils.book_new()
  // Sheet names are capped at 31 characters and reject several punctuation
  // marks, and a trade is free text a user typed.
  XLSX.utils.book_append_sheet(workbook, sheet, safeSheetName(grid.trade))

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  return triggerDownload(blob, fileName)
}

export function safeSheetName(trade: string): string {
  const cleaned = trade.replace(/[:\\/?*[\]]/g, " ").trim()
  return (cleaned.length > 0 ? cleaned : "Comparison").slice(0, 31)
}
