// Client-side report file generation — runs entirely in the browser, no
// server round-trip needed since the report data is already loaded there
// (components/reports/reports-shell.tsx). Only covers the two report types
// with real preview data behind them (estimate-summary, reconciliation);
// the rest are still placeholders (lib/report-data.ts) with nothing real
// to export yet. Every export function returns the real generated file's
// byte size so the caller can show it honestly, instead of the fabricated
// "1.4 MB" that used to sit here unconditionally.
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

import type { EstimateLineView } from "@/lib/estimate-view"
import type { ReconciliationRowView } from "@/lib/reconciliation-view"

export type ReportContext = {
  orgName: string
  projectName: string
  projectNumber: string
  bidDate: string
  preparedDate: string
}

function pdfHeader(doc: jsPDF, title: string, context: ReportContext) {
  doc.setFontSize(16)
  doc.text(title, 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`${context.projectName} · #${context.projectNumber}`, 14, 25)
  doc.text(`${context.orgName} · Bid date ${context.bidDate} · Prepared ${context.preparedDate}`, 14, 30)
  doc.setTextColor(0)
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

function downloadWorkbook(workbook: XLSX.WorkBook, fileName: string): number {
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  return triggerDownload(blob, fileName)
}

export function exportEstimateSummaryPdf(
  context: ReportContext,
  rows: EstimateLineView[],
  subtotal: string,
  markup: string,
  bidTotal: string,
  fileName: string,
): number {
  const doc = new jsPDF()
  pdfHeader(doc, "Estimate Summary", context)

  autoTable(doc, {
    startY: 36,
    head: [["Description", "Qty", "Unit", "Unit Price", "Total", "Source"]],
    body: rows.map((row) => [row.description, row.qty, row.unit, row.unitPrice, row.total, row.source]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [234, 88, 12] },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  doc.setFontSize(10)
  doc.text(`Subtotal: ${subtotal}`, 14, finalY + 8)
  doc.text(`Markup: ${markup}`, 14, finalY + 14)
  doc.setFontSize(12)
  doc.text(`Bid Total: ${bidTotal}`, 14, finalY + 22)

  return triggerDownload(doc.output("blob"), fileName)
}

export function exportEstimateSummaryExcel(
  context: ReportContext,
  rows: EstimateLineView[],
  subtotal: string,
  markup: string,
  bidTotal: string,
  fileName: string,
): number {
  const sheetRows = [
    [`${context.projectName} · #${context.projectNumber}`],
    [`${context.orgName} · Bid date ${context.bidDate} · Prepared ${context.preparedDate}`],
    [],
    ["Description", "Qty", "Unit", "Unit Price", "Total", "Source"],
    ...rows.map((row) => [row.description, row.qty, row.unit, row.unitPrice, row.total, row.source]),
    [],
    ["", "", "", "", "Subtotal", subtotal],
    ["", "", "", "", "Markup", markup],
    ["", "", "", "", "Bid Total", bidTotal],
  ]
  const sheet = XLSX.utils.aoa_to_sheet(sheetRows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, "Estimate Summary")
  return downloadWorkbook(workbook, fileName)
}

export function exportReconciliationPdf(
  context: ReportContext,
  rows: ReconciliationRowView[],
  bidTotal: string,
  fileName: string,
): number {
  const doc = new jsPDF()
  pdfHeader(doc, "Bid Form Reconciliation", context)

  autoTable(doc, {
    startY: 36,
    head: [["#", "Description", "Unit", "Official", "Estimate", "Diff", "Status"]],
    body: rows.map((row) => [
      row.itemNumber,
      row.description,
      row.unit,
      row.officialQty,
      row.estimateQty,
      row.diff,
      row.statusLabel,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [234, 88, 12] },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  doc.setFontSize(12)
  doc.text(`Bid Total: ${bidTotal}`, 14, finalY + 10)

  return triggerDownload(doc.output("blob"), fileName)
}

export function exportReconciliationExcel(
  context: ReportContext,
  rows: ReconciliationRowView[],
  fileName: string,
): number {
  const sheetRows = [
    [`${context.projectName} · #${context.projectNumber}`],
    [`${context.orgName} · Bid date ${context.bidDate} · Prepared ${context.preparedDate}`],
    [],
    ["#", "Description", "Unit", "Official Qty", "Estimate Qty", "Diff", "% Diff", "Status"],
    ...rows.map((row) => [
      row.itemNumber,
      row.description,
      row.unit,
      row.officialQty,
      row.estimateQty,
      row.diff,
      row.pctDiff,
      row.statusLabel,
    ]),
  ]
  const sheet = XLSX.utils.aoa_to_sheet(sheetRows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, "Reconciliation")
  return downloadWorkbook(workbook, fileName)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
