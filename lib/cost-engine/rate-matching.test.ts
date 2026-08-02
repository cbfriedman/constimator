import { describe, expect, it } from "vitest"

import type { costItems } from "@/db/schema"
import { findCandidateRates } from "./rate-matching"

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

describe("findCandidateRates", () => {
  it("matches an exact shared word (Grading / Grader)", () => {
    const rows = [makeCostItem({ id: "1", label: "Grader (CAT 140)" })]
    const matches = findCandidateRates({ trade: "Grading", description: "Fine grade subgrade" }, rows)
    expect(matches).toHaveLength(1)
    expect(matches[0].costItem.id).toBe("1")
  })

  it("matches Excavation / Excavator via prefix stemming (regression, step 19)", () => {
    // The original word-set matcher missed this pairing entirely (different
    // tokens despite sharing a root) — this is the case that caught it.
    const rows = [makeCostItem({ id: "1", category: "equipment", label: "Excavator (CAT 330)", rate: "145.00" })]
    const matches = findCandidateRates(
      { trade: "Grading", description: "Roadway Excavation" },
      rows,
    )
    expect(matches).toHaveLength(1)
    expect(matches[0].costItem.label).toBe("Excavator (CAT 330)")
  })

  it("does not match unrelated short words below the prefix length", () => {
    // "Excavation"/"Excavator" share a 5+ char prefix; "CY"/"Crew" etc.
    // shouldn't spuriously match just because they're short.
    const rows = [makeCostItem({ id: "1", label: "Crew Foreman" })]
    const matches = findCandidateRates({ trade: "Paving", description: "HMA Type A" }, rows)
    expect(matches).toHaveLength(0)
  })

  it("returns no matches when nothing overlaps", () => {
    const rows = [makeCostItem({ label: "Water Truck" })]
    const matches = findCandidateRates({ trade: "Electrical", description: "Conduit run" }, rows)
    expect(matches).toEqual([])
  })

  it("returns no matches against an empty cost_item list", () => {
    const matches = findCandidateRates({ trade: "Grading", description: "Roadway Excavation" }, [])
    expect(matches).toEqual([])
  })

  it("excludes margin-category rows even if the label matches", () => {
    const rows = [
      makeCostItem({ id: "1", category: "margin", label: "Excavation Contingency", percentValue: "5" }),
    ]
    const matches = findCandidateRates({ trade: "Grading", description: "Excavation" }, rows)
    expect(matches).toEqual([])
  })

  it("sorts by score descending and respects the limit", () => {
    // Scores against { trade: "Grading", description: "Roadway Excavation" }
    // (queryWords: grading, roadway, excavation):
    //   best:   "Roadway Excavator"   -> both words match -> 2/2 = 1.0
    //   middle: "Excavator Operator"  -> 1 of 2 words match -> 1/2 = 0.5
    //   worst:  "Excavator (CAT 330)" -> 1 of 3 words match -> 1/3 ≈ 0.33
    const best = makeCostItem({ id: "best", category: "equipment", label: "Roadway Excavator" })
    const middle = makeCostItem({ id: "middle", category: "labor", label: "Excavator Operator" })
    const worst = makeCostItem({ id: "worst", category: "equipment", label: "Excavator (CAT 330)" })

    const matches = findCandidateRates(
      { trade: "Grading", description: "Roadway Excavation" },
      [worst, best, middle],
      2,
    )

    expect(matches.map((m) => m.costItem.id)).toEqual(["best", "middle"])
  })
})
