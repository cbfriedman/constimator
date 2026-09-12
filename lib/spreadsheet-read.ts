import * as XLSX from "xlsx"

export type SheetRows = {
  name: string
  /** Every row as an array of cell values; numbers stay numbers. */
  rows: unknown[][]
}

export const SPREADSHEET_ACCEPT = ".xlsx,.xlsm,.xls,.csv"

// Read in the browser, not on the server: the file never has to travel
// through a Server Action (1MB body cap by default), and the contractor
// gets to see the parsed rows and fix the column mapping before a byte is
// sent. lib/report-export.ts already ships xlsx to the client for the
// same reason in the other direction.
export async function readSpreadsheet(file: File): Promise<SheetRows[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array" })
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name]
    const rows = sheet
      ? (XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
          blankrows: false,
          // Cell values, not their display strings — a currency-formatted
          // 1041 comes back as the number, not "$1,041.00".
          raw: true,
        }) as unknown[][])
      : []
    return { name, rows }
  })
}
