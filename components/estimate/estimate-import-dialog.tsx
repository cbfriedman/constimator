"use client"

import * as React from "react"
import { AlertTriangle, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { importEstimateFromSpreadsheetAction } from "@/app/estimate/actions"
import {
  FIELD_LABELS,
  IMPORT_FIELDS,
  REQUIRED_FIELDS,
  findHeaderRow,
  guessColumnMap,
  missingRequiredFields,
  rowsToEstimateLines,
  type ColumnMap,
  type ImportField,
} from "@/lib/estimate-import"
import { SPREADSHEET_ACCEPT, readSpreadsheet, type SheetRows } from "@/lib/spreadsheet-read"
import { cn } from "@/lib/utils"

const NOT_MAPPED = "none"

// "A", "B", … "AA" — the letter a contractor sees at the top of the column
// in Excel, so the mapping reads the way the sheet does.
function columnLetter(index: number): string {
  let n = index
  let out = ""
  do {
    out = String.fromCharCode(65 + (n % 26)) + out
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return out
}

function columnLabel(header: unknown[], index: number): string {
  const text = String(header[index] ?? "").trim()
  return text ? `${columnLetter(index)} · ${text}` : columnLetter(index)
}

/**
 * The whole "Import from Excel" flow in one dialog: pick a file, confirm
 * which column is which, uncheck rows that shouldn't come over, import.
 *
 * Parsing happens in the browser so the contractor sees exactly what will
 * be sent before it is. The column guess is only a starting point — every
 * estimating export names these columns differently, and a wrong guess
 * that imported silently would put the wrong number in the wrong field of
 * every line at once.
 */
export function EstimateImportDialog({
  open,
  onOpenChange,
  projectId,
  existingLineCount,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  /** How many lines the estimate has now — importing replaces them. */
  existingLineCount: number
  onImported: (result: { imported: number; linked: number; replaced: boolean }) => void
}) {
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [sheets, setSheets] = React.useState<SheetRows[]>([])
  const [sheetIndex, setSheetIndex] = React.useState(0)
  const [headerRow, setHeaderRow] = React.useState(0)
  const [columnMap, setColumnMap] = React.useState<ColumnMap>({})
  const [skippedRows, setSkippedRows] = React.useState<Set<number>>(() => new Set())
  const [reading, setReading] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [prevOpen, setPrevOpen] = React.useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setFileName(null)
      setSheets([])
      setSheetIndex(0)
      setHeaderRow(0)
      setColumnMap({})
      setSkippedRows(new Set())
    }
  }

  const sheet = sheets[sheetIndex]
  const header = React.useMemo(() => sheet?.rows[headerRow] ?? [], [sheet, headerRow])
  const columnCount = React.useMemo(
    () => (sheet ? Math.max(0, ...sheet.rows.slice(0, 50).map((row) => row.length)) : 0),
    [sheet],
  )
  const dataRows = React.useMemo(
    () => (sheet ? sheet.rows.slice(headerRow + 1) : []),
    [sheet, headerRow],
  )
  const parsed = React.useMemo(
    () => rowsToEstimateLines(dataRows, columnMap),
    [dataRows, columnMap],
  )
  const missing = missingRequiredFields(columnMap)
  const selectedCount = parsed.lines.filter((line) => !skippedRows.has(line.row)).length
  const problemsByRow = new Map(parsed.problems.map((problem) => [problem.row, problem.message]))

  function applySheet(nextSheets: SheetRows[], index: number) {
    const next = nextSheets[index]
    const nextHeader = next ? findHeaderRow(next.rows) : 0
    setSheetIndex(index)
    setHeaderRow(nextHeader)
    setColumnMap(next ? guessColumnMap(next.rows[nextHeader] ?? []) : {})
    setSkippedRows(new Set())
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setReading(true)
    try {
      const nextSheets = await readSpreadsheet(file)
      // Prefer the first sheet that actually has a header we recognize —
      // exports often lead with a cover or summary sheet.
      const firstUseful = nextSheets.findIndex((s) => {
        const h = findHeaderRow(s.rows)
        return missingRequiredFields(guessColumnMap(s.rows[h] ?? [])).length === 0
      })
      setFileName(file.name)
      setSheets(nextSheets)
      applySheet(nextSheets, firstUseful >= 0 ? firstUseful : 0)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that file.")
    } finally {
      setReading(false)
    }
  }

  function setMapping(field: ImportField, value: string | null) {
    setColumnMap((current) => {
      const next = { ...current }
      if (value == null || value === NOT_MAPPED) {
        delete next[field]
        return next
      }
      const index = Number(value)
      // One column, one field — steal it from whatever had it.
      for (const other of IMPORT_FIELDS) {
        if (other !== field && next[other] === index) delete next[other]
      }
      next[field] = index
      return next
    })
  }

  function toggleRow(row: number) {
    setSkippedRows((current) => {
      const next = new Set(current)
      if (!next.delete(row)) next.add(row)
      return next
    })
  }

  async function handleImport() {
    const lines = parsed.lines
      .filter((line) => !skippedRows.has(line.row))
      .map(({ itemNumber, description, quantity, unit, unitPrice, markupPct, note }) => ({
        itemNumber,
        description,
        quantity,
        unit,
        unitPrice,
        markupPct,
        note,
      }))
    if (lines.length === 0) return
    setPending(true)
    try {
      const result = await importEstimateFromSpreadsheetAction({
        projectId,
        replaceExisting: existingLineCount > 0,
        lines,
      })
      onImported(result)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't import — try again.")
    } finally {
      setPending(false)
    }
  }

  const canImport = sheet != null && missing.length === 0 && selectedCount > 0 && !pending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import estimate from Excel</DialogTitle>
          <DialogDescription>
            Bring in the estimate you already built. Check which column is
            which, uncheck any rows you don&apos;t want, then import.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field>
              <FieldLabel htmlFor="estimate-import-file">Spreadsheet (.xlsx or .csv)</FieldLabel>
              <Input
                id="estimate-import-file"
                type="file"
                accept={SPREADSHEET_ACCEPT}
                disabled={reading || pending}
                onChange={(e) => {
                  void handleFile(e.target.files?.[0])
                  e.target.value = ""
                }}
              />
            </Field>
            {sheets.length > 1 ? (
              <Field className="w-auto">
                <FieldLabel>Sheet</FieldLabel>
                <Select
                  value={String(sheetIndex)}
                  onValueChange={(value) => applySheet(sheets, Number(value ?? 0))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue>{(value) => sheets[Number(value)]?.name ?? "Sheet"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {sheets.map((s, index) => (
                      <SelectItem key={s.name} value={String(index)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
          </div>

          {sheet ? (
            <>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">Columns</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{fileName}</span> · header
                    on row {headerRow + 1}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {IMPORT_FIELDS.map((field) => {
                    const required = (REQUIRED_FIELDS as readonly string[]).includes(field)
                    const value = columnMap[field] === undefined ? NOT_MAPPED : String(columnMap[field])
                    return (
                      <Field key={field}>
                        <FieldLabel>
                          {FIELD_LABELS[field]}
                          {required ? <span className="text-destructive"> *</span> : null}
                        </FieldLabel>
                        <Select value={value} onValueChange={(v) => setMapping(field, v)}>
                          <SelectTrigger
                            size="sm"
                            className="w-full"
                            aria-invalid={required && value === NOT_MAPPED}
                          >
                            <SelectValue>
                              {(v) =>
                                v === NOT_MAPPED ? "Not in this sheet" : columnLabel(header, Number(v))
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NOT_MAPPED}>Not in this sheet</SelectItem>
                            {Array.from({ length: columnCount }, (_, index) => (
                              <SelectItem key={index} value={String(index)}>
                                {columnLabel(header, index)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    )
                  })}
                </div>
                {missing.length > 0 ? (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-warning">
                    <AlertTriangle className="size-3.5" />
                    Pick a column for {missing.map((f) => FIELD_LABELS[f]).join(", ")} to continue.
                  </p>
                ) : null}
              </div>

              {missing.length === 0 ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">
                      {parsed.lines.length} line{parsed.lines.length === 1 ? "" : "s"} found
                    </p>
                    {parsed.problems.length > 0 ? (
                      <p className="text-xs text-warning">
                        {parsed.problems.length} row{parsed.problems.length === 1 ? "" : "s"}{" "}
                        can&apos;t be imported — shown below
                      </p>
                    ) : null}
                  </div>
                  <div className="max-h-72 overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10" />
                          <TableHead className="w-14">#</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="w-16">Unit</TableHead>
                          <TableHead className="text-right">Unit price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dataRows.map((row, index) => {
                          const line = parsed.lines.find((l) => l.row === index)
                          const problem = problemsByRow.get(index)
                          if (!line && !problem) return null
                          if (problem) {
                            return (
                              <TableRow key={index} className="bg-warning/5">
                                <TableCell />
                                <TableCell className="text-muted-foreground tabular-nums">
                                  {index + headerRow + 2}
                                </TableCell>
                                <TableCell colSpan={4} className="text-xs">
                                  <span className="font-medium text-warning">{problem}</span>
                                  <span className="text-muted-foreground">
                                    {" — "}
                                    {row
                                      .map((cell) => String(cell ?? "").trim())
                                      .filter(Boolean)
                                      .join(" · ")
                                      .slice(0, 120)}
                                  </span>
                                </TableCell>
                              </TableRow>
                            )
                          }
                          const skipped = skippedRows.has(index)
                          return (
                            <TableRow key={index} className={cn(skipped && "opacity-50")}>
                              <TableCell>
                                <Checkbox
                                  checked={!skipped}
                                  onCheckedChange={() => toggleRow(index)}
                                  aria-label={`Import ${line!.description}`}
                                />
                              </TableCell>
                              <TableCell className="text-muted-foreground tabular-nums">
                                {line!.itemNumber ?? "—"}
                              </TableCell>
                              <TableCell className="font-medium">
                                {line!.description}
                                {line!.note ? (
                                  <span className="block text-xs font-normal text-muted-foreground">
                                    {line!.note}
                                  </span>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{line!.quantity}</TableCell>
                              <TableCell>{line!.unit}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {line!.unitPrice === "0" ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : (
                                  line!.unitPrice
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {existingLineCount > 0 ? (
                    <p className="flex items-center gap-1.5 text-xs text-warning">
                      <AlertTriangle className="size-3.5 shrink-0" />
                      Importing replaces the {existingLineCount} line
                      {existingLineCount === 1 ? "" : "s"} already in this estimate.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex items-center gap-3 rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
              <FileSpreadsheet className="size-5 shrink-0" />
              {reading
                ? "Reading…"
                : "Export your estimate from HeavyBid, HCSS, or Excel and choose the file above. One row per line item; the columns can be in any order."}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button onClick={handleImport} disabled={!canImport}>
            {pending
              ? "Importing…"
              : existingLineCount > 0
                ? `Replace with ${selectedCount} line${selectedCount === 1 ? "" : "s"}`
                : `Import ${selectedCount} line${selectedCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
