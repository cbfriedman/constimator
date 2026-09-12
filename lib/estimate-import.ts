/**
 * Turning a contractor's own estimate spreadsheet into estimate lines.
 *
 * This is the part of "Import from Excel" that has to be right and is
 * testable without a browser: which row is the header, which column is
 * which field, and what each cell means. The spreadsheet itself is read by
 * lib/spreadsheet-read.ts; the rows it produces come through here.
 *
 * Every estimator's export is laid out differently — HeavyBid, HCSS, and a
 * hand-built Excel template all put the same five numbers under different
 * headings, sometimes under a title block. So the column guess is exactly
 * that: a guess the contractor confirms in the dialog before anything is
 * imported. Nothing here decides silently.
 */

export const IMPORT_FIELDS = [
  "itemNumber",
  "description",
  "quantity",
  "unit",
  "unitPrice",
  "markupPct",
  "note",
] as const

export type ImportField = (typeof IMPORT_FIELDS)[number]

export const REQUIRED_FIELDS = ["description", "quantity", "unit"] as const

export const FIELD_LABELS: Record<ImportField, string> = {
  itemNumber: "Item #",
  description: "Description",
  quantity: "Quantity",
  unit: "Unit",
  unitPrice: "Unit price",
  markupPct: "Markup %",
  note: "Note",
}

/** Field → zero-based column index in the sheet. Absent means "not mapped". */
export type ColumnMap = Partial<Record<ImportField, number>>

// Same idea as scripts/real-job/compare.ts's HEADER_ALIASES, widened to what
// estimating exports actually print. Order matters within a field only for
// readability; matching is exact against the normalized header text.
const HEADER_ALIASES: Record<ImportField, string[]> = {
  itemNumber: [
    "item",
    "item no",
    "item number",
    "item #",
    "line",
    "line item",
    "line no",
    "line number",
    "no",
    "#",
    "bid item",
    "biditem",
    "pay item",
  ],
  description: ["description", "desc", "item description", "bid item description", "activity", "work item"],
  quantity: ["quantity", "qty", "quant", "estimated quantity", "est quantity", "bid quantity", "takeoff quantity", "takeoff qty"],
  unit: ["unit", "units", "uom", "um", "unit of measure", "measure"],
  unitPrice: ["unit price", "unit cost", "price", "rate", "unit rate", "bid price", "unit bid price", "price each", "cost each"],
  markupPct: ["markup", "markup %", "markup pct", "mu", "mu %", "margin", "margin %"],
  note: ["note", "notes", "comment", "comments", "remarks"],
}

/**
 * Lowercased, punctuation stripped, whitespace collapsed — so "Unit Price ($)",
 * "UNIT_PRICE" and "Unit price" all land on "unit price".
 */
export function normalizeHeader(cell: unknown): string {
  return String(cell ?? "")
    .toLowerCase()
    .replace(/[()$%.,:_/\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function aliasField(cell: unknown): ImportField | null {
  const text = normalizeHeader(cell)
  if (!text) return null
  for (const field of IMPORT_FIELDS) {
    if (HEADER_ALIASES[field].includes(text)) return field
  }
  return null
}

/**
 * The header is the first row that names at least two fields we know —
 * enough to tell a real header from a title block ("ACME Grading — Grand
 * Ave Streetscape") or a blank spacer row above it. Only the first 20 rows
 * are considered; a header further down than that isn't a header.
 */
export function findHeaderRow(rows: unknown[][]): number {
  const limit = Math.min(rows.length, 20)
  for (let i = 0; i < limit; i += 1) {
    const matched = new Set<ImportField>()
    for (const cell of rows[i] ?? []) {
      const field = aliasField(cell)
      if (field) matched.add(field)
    }
    if (matched.size >= 2) return i
  }
  return 0
}

/**
 * Best guess at which column holds which field. First alias hit wins per
 * field and a column is never assigned twice, so a sheet with both "Item"
 * and "Item Description" maps the second to description rather than
 * clobbering the item number.
 */
export function guessColumnMap(header: unknown[]): ColumnMap {
  const map: ColumnMap = {}
  const taken = new Set<number>()
  header.forEach((cell, index) => {
    const field = aliasField(cell)
    if (!field || map[field] !== undefined || taken.has(index)) return
    map[field] = index
    taken.add(index)
  })
  return map
}

export function missingRequiredFields(map: ColumnMap): ImportField[] {
  return REQUIRED_FIELDS.filter((field) => map[field] === undefined)
}

/**
 * "$1,041.00" → 1041, "1 200" → 1200, "(50)" → -50, "" → null. Cells that
 * come out of xlsx as real numbers pass straight through. Anything that
 * still isn't a number after the currency dressing is stripped is null so
 * the row gets flagged instead of importing as zero.
 */
export function parseCellNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value !== "string") return null
  let text = value.trim()
  if (!text) return null
  const negative = /^\(.*\)$/.test(text)
  text = text.replace(/[()$,\s]/g, "")
  if (!text || !/^-?\d*\.?\d+$/.test(text)) return null
  const number = Number(text)
  if (!Number.isFinite(number)) return null
  return negative ? -number : number
}

function cellText(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : ""
  return String(value).trim()
}

// A row whose description is one of these and which carries no quantity is
// the sheet's own arithmetic, not a bid item.
const SUMMARY_ROW = /^(sub\s?-?total|total|grand\s?total|bid\s?total|summary|markup|contingency|overhead|profit|tax(es)?|bond(s)?)\b/i

export type ImportedEstimateLine = {
  itemNumber: string | null
  description: string
  quantity: string
  unit: string
  unitPrice: string
  markupPct: string | null
  note: string | null
}

/** An importable line plus which row of the data it came from, so a preview can key on it. */
export type ParsedEstimateRow = ImportedEstimateLine & { row: number }

export type RowProblem = {
  /** Zero-based index into the rows array passed in (not the sheet's row number). */
  row: number
  message: string
}

/**
 * Data rows → estimate lines. Blank rows and summary rows (Subtotal, Total…)
 * are dropped silently — they're not items and nobody wants to be told
 * about them. Rows that look like items but can't be imported (no
 * description, unreadable quantity, no unit) come back as problems so the
 * dialog can show them next to the rows that will import. Skipping bad
 * rows without saying so is how a 62-line estimate quietly becomes 59.
 */
export function rowsToEstimateLines(
  rows: unknown[][],
  map: ColumnMap,
): { lines: ParsedEstimateRow[]; problems: RowProblem[] } {
  const lines: ParsedEstimateRow[] = []
  const problems: RowProblem[] = []
  const pick = (row: unknown[], field: ImportField): unknown =>
    map[field] === undefined ? undefined : row[map[field]!]

  rows.forEach((row, index) => {
    if (!row || row.every((cell) => cellText(cell) === "")) return

    const description = cellText(pick(row, "description"))
    const quantity = parseCellNumber(pick(row, "quantity"))
    const unit = cellText(pick(row, "unit"))

    if (SUMMARY_ROW.test(description) && quantity == null) return
    if (!description) {
      // A row with numbers but no description is usually a spacer with a
      // stray formula; only flag it if it actually has a quantity.
      if (quantity != null) problems.push({ row: index, message: "No description" })
      return
    }
    if (quantity == null) {
      problems.push({ row: index, message: "Quantity isn't a number" })
      return
    }
    if (!unit) {
      problems.push({ row: index, message: "No unit" })
      return
    }

    const unitPrice = parseCellNumber(pick(row, "unitPrice"))
    // Excel exports print a 10% markup as either 10 or 0.1 depending on
    // whether the cell was formatted as a percentage. Nobody marks up by
    // under one percent, so a value in (0, 1) is the fraction form.
    const rawMarkup = parseCellNumber(pick(row, "markupPct"))
    // Rounded to the column's 3 decimals so 0.12 → "12", not "12.000000000000002".
    const markupPct =
      rawMarkup != null && rawMarkup > 0 && rawMarkup < 1
        ? Math.round(rawMarkup * 100_000) / 1000
        : rawMarkup
    const itemNumber = cellText(pick(row, "itemNumber"))
    const note = cellText(pick(row, "note"))

    lines.push({
      row: index,
      itemNumber: itemNumber || null,
      description,
      quantity: String(quantity),
      unit,
      unitPrice: unitPrice == null ? "0" : String(unitPrice),
      markupPct: markupPct == null ? null : String(markupPct),
      note: note || null,
    })
  })

  return { lines, problems }
}
