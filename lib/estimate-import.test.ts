import { describe, expect, it } from "vitest"

import {
  findHeaderRow,
  guessColumnMap,
  missingRequiredFields,
  normalizeHeader,
  parseCellNumber,
  rowsToEstimateLines,
} from "@/lib/estimate-import"

// The layout the City of South San Francisco published its Grand Ave bid
// schedule in — the one real export we have on hand.
const cityHeader = ["Line Item", "Description", "Quantity", "Unit of Measure", "Unit Cost", "Total"]

// What a HeavyBid-style report looks like once it's in Excel: terse
// headings, a title block above them.
const heavyBidSheet: unknown[][] = [
  ["ACME Grading, Inc.", "", "", "", ""],
  ["Grand Ave & Airport Blvd — Bid Summary", "", "", "", ""],
  [],
  ["Item", "Description", "Qty", "UM", "Unit Price"],
  ["1", "Mobilization", 1, "LS", 25000],
  ["4", "Remove and Dispose of Curb & Gutter", 1041, "LF", 12.5],
  ["", "", "", "", ""],
  ["", "Subtotal", "", "", 38012.5],
]

describe("normalizeHeader", () => {
  it("lands the common spellings on one form", () => {
    expect(normalizeHeader("Unit Price ($)")).toBe("unit price")
    expect(normalizeHeader("UNIT_PRICE")).toBe("unit price")
    expect(normalizeHeader("  Unit  price ")).toBe("unit price")
  })
})

describe("guessColumnMap", () => {
  it("maps a city bid-schedule export", () => {
    expect(guessColumnMap(cityHeader)).toEqual({
      itemNumber: 0,
      description: 1,
      quantity: 2,
      unit: 3,
      unitPrice: 4,
    })
  })

  it("maps HeavyBid-style short headings", () => {
    expect(guessColumnMap(["Item", "Description", "Qty", "UM", "Unit Price", "Markup %", "Notes"])).toEqual({
      itemNumber: 0,
      description: 1,
      quantity: 2,
      unit: 3,
      unitPrice: 4,
      markupPct: 5,
      note: 6,
    })
  })

  it("never assigns one column to two fields", () => {
    const map = guessColumnMap(["Item", "Item Description", "Qty", "Unit"])
    expect(map.itemNumber).toBe(0)
    expect(map.description).toBe(1)
  })

  it("leaves unknown columns unmapped so the contractor is asked", () => {
    const map = guessColumnMap(["Code", "Work", "Amount", "Each"])
    expect(missingRequiredFields(map)).toEqual(["description", "quantity", "unit"])
  })
})

describe("findHeaderRow", () => {
  it("skips a title block to find the real header", () => {
    expect(findHeaderRow(heavyBidSheet)).toBe(3)
  })

  it("is the first row when the sheet starts with the header", () => {
    expect(findHeaderRow([cityHeader, ["1", "Mobilization", 1, "LS", "", ""]])).toBe(0)
  })

  it("falls back to the first row rather than guessing wildly", () => {
    expect(findHeaderRow([["a", "b"], ["c", "d"]])).toBe(0)
  })
})

describe("parseCellNumber", () => {
  it("reads currency and thousands formatting", () => {
    expect(parseCellNumber("$1,041.00")).toBe(1041)
    expect(parseCellNumber("1 200")).toBe(1200)
    expect(parseCellNumber("(50)")).toBe(-50)
    expect(parseCellNumber(655)).toBe(655)
  })

  it("refuses text so a bad cell becomes a flagged row, not a zero", () => {
    expect(parseCellNumber("")).toBeNull()
    expect(parseCellNumber("TBD")).toBeNull()
    expect(parseCellNumber("12 LF")).toBeNull()
    expect(parseCellNumber(null)).toBeNull()
  })
})

describe("rowsToEstimateLines", () => {
  const map = guessColumnMap(heavyBidSheet[3]!)
  const dataRows = heavyBidSheet.slice(4)

  it("turns data rows into lines and drops blank and summary rows silently", () => {
    const { lines, problems } = rowsToEstimateLines(dataRows, map)
    expect(problems).toEqual([])
    expect(lines).toHaveLength(2)
    expect(lines[1]).toMatchObject({
      row: 1,
      itemNumber: "4",
      description: "Remove and Dispose of Curb & Gutter",
      quantity: "1041",
      unit: "LF",
      unitPrice: "12.5",
      markupPct: null,
      note: null,
    })
  })

  it("defaults a missing unit price to 0 rather than refusing the row", () => {
    const { lines } = rowsToEstimateLines([["7", "Clearing", 3, "AC", ""]], map)
    expect(lines[0]?.unitPrice).toBe("0")
  })

  it("flags rows it cannot import instead of dropping them", () => {
    const { lines, problems } = rowsToEstimateLines(
      [
        ["8", "Roadway Excavation", "TBD", "CY", 14.2],
        ["9", "Aggregate Base", 900, "", 38],
        ["", "", 12, "EA", 5],
      ],
      map,
    )
    expect(lines).toEqual([])
    expect(problems).toEqual([
      { row: 0, message: "Quantity isn't a number" },
      { row: 1, message: "No unit" },
      { row: 2, message: "No description" },
    ])
  })

  it("keeps a row whose description merely starts with a summary word", () => {
    // "Total Station Survey" is a real pay item; "Total" with no quantity is arithmetic.
    const { lines } = rowsToEstimateLines(
      [
        ["12", "Total Station Survey", 1, "LS", 4000],
        ["", "Total", "", "", 4000],
      ],
      map,
    )
    expect(lines.map((line) => line.description)).toEqual(["Total Station Survey"])
  })

  it("reads a percentage-formatted markup as a percent", () => {
    const withMarkup = { ...map, markupPct: 5 }
    const { lines } = rowsToEstimateLines(
      [
        ["1", "Mobilization", 1, "LS", 100, 0.12],
        ["2", "Clearing", 1, "LS", 100, 12],
      ],
      withMarkup,
    )
    expect(lines.map((line) => line.markupPct)).toEqual(["12", "12"])
  })
})
