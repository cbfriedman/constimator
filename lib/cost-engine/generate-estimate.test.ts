import { describe, expect, it } from "vitest"

import type { costItems } from "@/db/schema"
import { generateEstimateLines } from "./generate-estimate"
import type { ExtractedTakeoffItem } from "./types"

type CostItemRow = typeof costItems.$inferSelect

function makeCostItem(overrides: Partial<CostItemRow> = {}): CostItemRow {
  return {
    id: "cost-item-1",
    orgId: "org-1",
    category: "labor",
    label: "Operator",
    baseRate: "45.00",
    fringeRate: "12.00",
    rate: null,
    rateUnit: null,
    ownership: null,
    percentValue: null,
    helperText: null,
    requiredWhenIncomplete: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  }
}

function makeItem(overrides: Partial<ExtractedTakeoffItem> = {}): ExtractedTakeoffItem {
  return {
    trade: "Grading",
    description: "Roadway Excavation",
    quantity: 8450,
    unit: "CY",
    ...overrides,
  }
}

describe("generateEstimateLines", () => {
  it("returns an empty array for no extracted items", () => {
    expect(generateEstimateLines([], [])).toEqual([])
  })

  it("never fabricates a price — unitPrice and total are always 0, even with a strong rate match", () => {
    const costItemRows = [
      makeCostItem({ category: "equipment", label: "Excavator (CAT 330)", rate: "145.00" }),
    ]
    const [line] = generateEstimateLines([makeItem()], costItemRows)
    expect(line.unitPrice).toBe("0")
    expect(line.total).toBe("0")
    expect(line.source).toBe("ai_extracted")
  })

  it("handles a zero quantity explicitly — still produces a line, doesn't crash or drop it", () => {
    const [line] = generateEstimateLines([makeItem({ quantity: 0 })], [])
    expect(line.quantity).toBe("0")
    expect(line.unitPrice).toBe("0")
    expect(line.total).toBe("0")
  })

  it("flags a missing rate match with a clear note, not a silent gap", () => {
    const [line] = generateEstimateLines([makeItem({ description: "Xyzzy Unmatched Item" })], [])
    expect(line.note).toBe("No matching company rate found — needs pricing.")
  })

  it("surfaces a matched rate as an unpriced suggestion, not an applied price", () => {
    const costItemRows = [
      makeCostItem({ category: "equipment", label: "Excavator (CAT 330)", rate: "145.00" }),
    ]
    const [line] = generateEstimateLines([makeItem()], costItemRows)
    expect(line.note).toBe(
      "Possible rate: Excavator (CAT 330) ($145.00/hr) — unpriced, needs review.",
    )
    expect(line.unitPrice).toBe("0")
  })

  it("prepends the extracted item's own notes ahead of the rate note", () => {
    const [line] = generateEstimateLines(
      [makeItem({ notes: "Sheet C-14 cross-section was partially illegible" })],
      [],
    )
    expect(line.note).toBe(
      "Sheet C-14 cross-section was partially illegible No matching company rate found — needs pricing.",
    )
  })

  it("uses the org's General Markup cost_item when present", () => {
    const costItemRows = [
      makeCostItem({ category: "margin", label: "General Markup", percentValue: "12.5" }),
    ]
    const [line] = generateEstimateLines([makeItem()], costItemRows)
    expect(line.markupPct).toBe("12.5")
  })

  it("falls back to 10% markup when no General Markup cost_item exists", () => {
    const [line] = generateEstimateLines([makeItem()], [])
    expect(line.markupPct).toBe("10")
  })

  it("falls back to 10% markup when General Markup's percentValue is non-numeric", () => {
    const costItemRows = [
      makeCostItem({ category: "margin", label: "General Markup", percentValue: "not-a-number" }),
    ]
    const [line] = generateEstimateLines([makeItem()], costItemRows)
    expect(line.markupPct).toBe("10")
  })

  it("processes multiple items independently, each with its own rate match", () => {
    const costItemRows = [
      makeCostItem({ category: "equipment", label: "Excavator (CAT 330)", rate: "145.00" }),
    ]
    const items = [
      makeItem({ description: "Roadway Excavation" }),
      makeItem({ description: "Unrelated Signage Item", trade: "Traffic Control" }),
    ]
    const lines = generateEstimateLines(items, costItemRows)
    expect(lines).toHaveLength(2)
    expect(lines[0].note).toContain("Possible rate: Excavator")
    expect(lines[1].note).toBe("No matching company rate found — needs pricing.")
  })
})
