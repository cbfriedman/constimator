import { describe, expect, it } from "vitest"

import type { bids, estimateLines } from "@/db/schema"
import { diffBidAgainstEstimate } from "./reconciliation-diff"

type BidRow = typeof bids.$inferSelect
type EstimateLineRow = typeof estimateLines.$inferSelect

let bidCounter = 0
function makeBid(overrides: Partial<BidRow> = {}): BidRow {
  bidCounter += 1
  return {
    id: `bid-${bidCounter}`,
    orgId: "org-1",
    projectId: "project-1",
    documentId: null,
    itemNumber: String(bidCounter),
    description: "Roadway Excavation",
    unit: "CY",
    officialQuantity: "8450.00",
    specSection: null,
    extractionConfidence: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  }
}

let lineCounter = 0
function makeLine(overrides: Partial<EstimateLineRow> = {}): EstimateLineRow {
  lineCounter += 1
  return {
    id: `line-${lineCounter}`,
    orgId: "org-1",
    estimateId: "estimate-1",
    bidId: null,
    lineNumber: lineCounter,
    description: "Roadway Excavation",
    note: null,
    quantity: "8450.00",
    unit: "CY",
    unitPrice: "14.20",
    laborCost: null,
    materialCost: null,
    equipmentCost: null,
    subCost: null,
    markupPct: "10",
    total: "119990.00",
    source: "manual",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  }
}

describe("diffBidAgainstEstimate", () => {
  it("flags a bid item with no matching estimate line as missing", () => {
    const bid = makeBid()
    const [result] = diffBidAgainstEstimate([bid], [])

    expect(result.statusColor).toBe("red")
    expect(result.attention).toBe(true)
    expect(result.filters).toEqual(["missing"])
    expect(result.estimateLineId).toBeNull()
  })

  it("matches an exact quantity as a clean match", () => {
    const bid = makeBid({ officialQuantity: "8450.00" })
    const line = makeLine({ quantity: "8450.00" })
    const [result] = diffBidAgainstEstimate([bid], [line])

    expect(result.statusColor).toBe("green")
    expect(result.attention).toBe(false)
    expect(result.filters).toEqual(["matched"])
    expect(result.diffQuantity).toBe("0")
  })

  it("flags a quantity discrepancy with the correct sign and percentage", () => {
    const bid = makeBid({ officialQuantity: "100.00" })
    const line = makeLine({ quantity: "120.00" })
    const [result] = diffBidAgainstEstimate([bid], [line])

    expect(result.statusColor).toBe("amber")
    expect(result.attention).toBe(true)
    expect(result.filters).toEqual(["quantity_discrepancy"])
    expect(result.diffQuantity).toBe("20")
    expect(result.diffPct).toBe("20")
  })

  it("computes a negative discrepancy when the estimate under-counts the official quantity", () => {
    const bid = makeBid({ officialQuantity: "100.00" })
    const line = makeLine({ quantity: "80.00" })
    const [result] = diffBidAgainstEstimate([bid], [line])

    expect(result.diffQuantity).toBe("-20")
    expect(result.diffPct).toBe("-20")
    expect(result.attention).toBe(true)
  })

  it("treats lump-sum items as scope-verify, not a quantity comparison", () => {
    const bid = makeBid({ unit: "LS", officialQuantity: "1.00" })
    const line = makeLine({ unit: "LS", quantity: "1.00" })
    const [result] = diffBidAgainstEstimate([bid], [line])

    expect(result.statusColor).toBe("yellow")
    expect(result.attention).toBe(false)
    expect(result.filters).toEqual(["matched", "lump_sum"])
  })

  it("matches lump-sum unit case-insensitively", () => {
    const bid = makeBid({ unit: "ls" })
    const line = makeLine({ unit: "LS" })
    const [result] = diffBidAgainstEstimate([bid], [line])

    expect(result.filters).toContain("lump_sum")
  })

  it("flags a unit mismatch and does not attempt a quantity comparison", () => {
    const bid = makeBid({ unit: "CY", officialQuantity: "500.00" })
    const line = makeLine({ unit: "TON", quantity: "500.00" })
    const [result] = diffBidAgainstEstimate([bid], [line])

    expect(result.statusColor).toBe("yellow")
    expect(result.attention).toBe(true)
    expect(result.filters).toEqual(["unit_converted"])
    expect(result.diffQuantity).toBeNull()
  })

  describe("zero quantities", () => {
    it("matches when both the official and estimate quantity are zero", () => {
      const bid = makeBid({ officialQuantity: "0" })
      const line = makeLine({ quantity: "0" })
      const [result] = diffBidAgainstEstimate([bid], [line])

      expect(result.statusColor).toBe("green")
      expect(result.diffQuantity).toBe("0")
    })

    it("flags a discrepancy against a zero official quantity without dividing by zero", () => {
      const bid = makeBid({ officialQuantity: "0" })
      const line = makeLine({ quantity: "5" })
      const [result] = diffBidAgainstEstimate([bid], [line])

      expect(result.statusColor).toBe("amber")
      expect(result.diffQuantity).toBe("5")
      // officialQty is 0, so a percentage is undefined — must be null, not
      // NaN or Infinity, since this gets persisted to a numeric DB column.
      expect(result.diffPct).toBeNull()
    })
  })

  describe("partial bids (mixed match states in one call)", () => {
    it("classifies each bid item independently in a single bid form", () => {
      const matched = makeBid({ itemNumber: "1", description: "Roadway Excavation", officialQuantity: "8450.00" })
      const missing = makeBid({ itemNumber: "2", description: "Traffic Control System" })
      const discrepant = makeBid({ itemNumber: "3", description: "HMA Type A", officialQuantity: "4850.00" })

      const lines = [
        makeLine({ description: "Roadway Excavation", quantity: "8450.00" }),
        makeLine({ description: "HMA Type A", quantity: "5000.00" }),
        // no line for "Traffic Control System" — only 2 of 3 bid items priced
      ]

      const results = diffBidAgainstEstimate([matched, missing, discrepant], lines)

      expect(results).toHaveLength(3)
      expect(results[0].statusColor).toBe("green")
      expect(results[1].statusColor).toBe("red")
      expect(results[1].filters).toEqual(["missing"])
      expect(results[2].statusColor).toBe("amber")
      expect(results[2].diffQuantity).toBe("150")
    })

    it("does not let one bid item's match affect another's", () => {
      // Two bid items sharing a unit but nothing else — verifies matching
      // is per-row, not accidentally stateful across the array.
      const a = makeBid({ description: "Item A", officialQuantity: "10" })
      const b = makeBid({ description: "Item B", officialQuantity: "20" })
      const lines = [makeLine({ description: "Item A", quantity: "10" })]
      // no line for Item B

      const results = diffBidAgainstEstimate([a, b], lines)

      expect(results[0].statusColor).toBe("green")
      expect(results[1].statusColor).toBe("red")
    })
  })

  describe("estimate line matching", () => {
    it("prefers the estimate_line.bidId link over a description match", () => {
      const bid = makeBid({ description: "Roadway Excavation", officialQuantity: "100" })
      const linkedLine = makeLine({ bidId: bid.id, description: "Something Renamed", quantity: "100" })
      const decoyLine = makeLine({ description: "Roadway Excavation", quantity: "999" })

      const [result] = diffBidAgainstEstimate([bid], [decoyLine, linkedLine])

      expect(result.estimateLineId).toBe(linkedLine.id)
      expect(result.statusColor).toBe("green")
    })

    it("does not guess when multiple unlinked estimate lines share the bid's description", () => {
      const bid = makeBid({ description: "Roadway Excavation" })
      const lineA = makeLine({ description: "Roadway Excavation", quantity: "100" })
      const lineB = makeLine({ description: "Roadway Excavation", quantity: "200" })

      const [result] = diffBidAgainstEstimate([bid], [lineA, lineB])

      // Ambiguous — safer to report "no confident match" than guess.
      expect(result.estimateLineId).toBeNull()
      expect(result.statusColor).toBe("red")
    })

    it("matches by description case- and whitespace-insensitively when unambiguous", () => {
      const bid = makeBid({ description: "  Roadway Excavation  " })
      const line = makeLine({ description: "roadway excavation" })

      const [result] = diffBidAgainstEstimate([bid], [line])

      expect(result.estimateLineId).toBe(line.id)
    })
  })
})
