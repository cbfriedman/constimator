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

// A configured General Markup row, so a test that isn't about the
// markup-not-set path doesn't have to carry that note in its expectations.
function markupRow(percentValue: string | null) {
  return makeCostItem({
    id: "cost-item-markup",
    category: "margin",
    label: "General Markup",
    baseRate: null,
    fringeRate: null,
    percentValue,
  })
}

const NOT_SET_NOTE = "Company markup not set — set it in Cost Setup before bidding."

describe("generateEstimateLines", () => {
  it("returns an empty array for no extracted items", () => {
    expect(generateEstimateLines([], [])).toEqual([])
  })

  it("never fabricates a price — unitPrice and total are always 0, even with a strong rate match", () => {
    const costItemRows = [
      makeCostItem({ category: "equipment", label: "Excavator (CAT 330)", rate: "145.00" }),
      markupRow("10"),
    ]
    const [line] = generateEstimateLines([makeItem()], costItemRows)
    expect(line.unitPrice).toBe("0")
    expect(line.total).toBe("0")
    expect(line.source).toBe("ai_extracted")
  })

  it("handles a zero quantity explicitly — still produces a line, doesn't crash or drop it", () => {
    const [line] = generateEstimateLines([makeItem({ quantity: 0 })], [markupRow("10")])
    expect(line.quantity).toBe("0")
    expect(line.unitPrice).toBe("0")
    expect(line.total).toBe("0")
  })

  it("flags a missing rate match with a clear note, not a silent gap", () => {
    const [line] = generateEstimateLines(
      [makeItem({ description: "Xyzzy Unmatched Item" })],
      [markupRow("10")],
    )
    expect(line.note).toBe("No matching company rate found — needs pricing.")
  })

  it("surfaces a matched rate as an unpriced suggestion, not an applied price", () => {
    const costItemRows = [
      makeCostItem({ category: "equipment", label: "Excavator (CAT 330)", rate: "145.00" }),
      markupRow("10"),
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
      [markupRow("10")],
    )
    expect(line.note).toBe(
      "Sheet C-14 cross-section was partially illegible No matching company rate found — needs pricing.",
    )
  })

  it("uses the org's General Markup cost_item when present", () => {
    const [line] = generateEstimateLines([makeItem()], [markupRow("12.5")])
    expect(line.markupPct).toBe("12.5")
  })

  // The three assertions below replace tests that asserted a 10% fallback.
  // That fallback was removed: Cost Setup no longer seeds a markup value, so
  // "10" would have been a fabricated margin stamped onto a real bid for an
  // org that never entered one. Stamping 0 and saying so on the line is the
  // behaviour we want to keep.
  it("does not invent a markup when no General Markup cost_item exists", () => {
    const [line] = generateEstimateLines([makeItem()], [])
    expect(line.markupPct).toBe("0")
    expect(line.note).toContain(NOT_SET_NOTE)
  })

  it("treats an unset General Markup row as not configured", () => {
    const [line] = generateEstimateLines([makeItem()], [markupRow(null)])
    expect(line.markupPct).toBe("0")
    expect(line.note).toContain(NOT_SET_NOTE)
  })

  it("treats a non-numeric General Markup as not configured rather than as 10%", () => {
    const [line] = generateEstimateLines([makeItem()], [markupRow("not-a-number")])
    expect(line.markupPct).toBe("0")
    expect(line.note).toContain(NOT_SET_NOTE)
  })

  it("honours an explicit 0% markup as a real answer, with no not-set note", () => {
    const [line] = generateEstimateLines([makeItem()], [markupRow("0")])
    expect(line.markupPct).toBe("0")
    expect(line.note).not.toContain(NOT_SET_NOTE)
  })

  it("does not suggest a scaffold rate the org hasn't filled in yet", () => {
    // Cost Setup creates rows with NULL rates so the page is editable. Those
    // match by name just as well as a real rate, and "($0.00/hr)" reads like
    // a genuine answer.
    const costItemRows = [
      makeCostItem({
        category: "equipment",
        label: "Excavator (CAT 330)",
        baseRate: null,
        fringeRate: null,
        rate: null,
      }),
      markupRow("10"),
    ]
    const [line] = generateEstimateLines([makeItem()], costItemRows)
    expect(line.note).toBe("No matching company rate found — needs pricing.")
  })

  it("processes multiple items independently, each with its own rate match", () => {
    const costItemRows = [
      makeCostItem({ category: "equipment", label: "Excavator (CAT 330)", rate: "145.00" }),
      markupRow("10"),
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
