import { describe, expect, it } from "vitest"

import {
  VERIFICATION_DISCLAIMER,
  unverifiedBadge,
  unverifiedNotice,
} from "@/lib/export-disclaimer"
import { cellToText, countUnverified, safeSheetName } from "@/lib/comparison-export"
import { buildComparisonGrid } from "@/lib/quote-comparison"

describe("VERIFICATION_DISCLAIMER", () => {
  it("states the obligation the Terms of Service also carry", () => {
    // Section 6 of the Terms renders this same constant, so these two can't
    // drift. If this assertion is ever loosened, check the Terms still say it.
    expect(VERIFICATION_DISCLAIMER).toContain("solely responsible for verifying")
    expect(VERIFICATION_DISCLAIMER).toContain("before submitting a bid")
    expect(VERIFICATION_DISCLAIMER).toContain("not guaranteed to be accurate")
  })
})

describe("unverifiedNotice", () => {
  it("says nothing when everything is confirmed", () => {
    expect(unverifiedNotice(0, 18)).toBeNull()
    expect(unverifiedBadge(0)).toBeNull()
  })

  it("carries the count and what it means", () => {
    const notice = unverifiedNotice(4, 18)
    expect(notice).toContain("4")
    expect(notice).toContain("18")
    expect(notice).toContain("UNVERIFIED")
    expect(notice).toContain("Confirm them in Constimator")
  })

  it("reads correctly for a single item", () => {
    expect(unverifiedNotice(1, 18)).toContain("1 of 18 item has")
  })

  it("omits the total when there isn't one worth stating", () => {
    expect(unverifiedNotice(2, 0)).toContain("2 items have")
  })

  it("never reports a negative count as a warning", () => {
    expect(unverifiedNotice(-1, 10)).toBeNull()
  })
})

describe("countUnverified", () => {
  function grid(conditions: { sub: string; confirmed: boolean }[]) {
    return buildComparisonGrid(
      "Paving",
      [
        { subQuoteId: "a", subName: "Ace", trade: "Paving", totalAmount: "100" },
        { subQuoteId: "b", subName: "Bex", trade: "Paving", totalAmount: "90" },
      ],
      conditions.map((entry, index) => ({
        id: `c${index}`,
        subQuoteId: entry.sub,
        category: "traffic_control",
        rawText: "Traffic control by others",
        normalizedValue: null,
        isConfirmed: entry.confirmed,
        primeCostUsd: null,
      })),
    )
  }

  it("counts unconfirmed conditions across every column", () => {
    const result = countUnverified(
      grid([
        { sub: "a", confirmed: false },
        { sub: "a", confirmed: true },
        { sub: "b", confirmed: false },
      ]),
    )
    expect(result).toEqual({ unverified: 2, total: 3 })
  })

  it("reports zero for a fully confirmed grid", () => {
    const result = countUnverified(grid([{ sub: "a", confirmed: true }]))
    expect(result.unverified).toBe(0)
  })

  it("reports zero for an empty grid rather than throwing", () => {
    expect(countUnverified({ trade: "Paving", columns: [], rows: [] })).toEqual({
      unverified: 0,
      total: 0,
    })
  })
})

describe("cellToText", () => {
  it("keeps the stance word so a monochrome printout still reads", () => {
    const text = cellToText({
      subQuoteId: "a",
      stance: "excluded",
      entries: [
        {
          conditionId: "c1",
          stance: "excluded",
          detail: "Traffic control by others",
          isConfirmed: true,
          primeCostUsd: null,
        },
      ],
    })
    expect(text).toBe("Excluded — Traffic control by others")
  })

  it("marks an unconfirmed entry inline, where it can't be separated from its value", () => {
    const text = cellToText({
      subQuoteId: "a",
      stance: "excluded",
      entries: [
        {
          conditionId: "c1",
          stance: "excluded",
          detail: "Traffic control by others",
          isConfirmed: false,
          primeCostUsd: null,
        },
      ],
    })
    expect(text).toContain("[unverified]")
  })

  it("shows the prime's cost against a costed exclusion", () => {
    const text = cellToText({
      subQuoteId: "a",
      stance: "excluded",
      entries: [
        {
          conditionId: "c1",
          stance: "excluded",
          detail: "Traffic control by others",
          isConfirmed: true,
          primeCostUsd: 12000,
        },
      ],
    })
    expect(text).toContain("$12,000.00")
  })

  it("renders an empty cell as not stated, never as blank", () => {
    // A blank cell in an exported grid reads as "no data captured"; the
    // distinction between silence and exclusion has to survive the export.
    expect(cellToText({ subQuoteId: "a", stance: "not_stated", entries: [] })).toBe("Not stated")
  })
})

describe("safeSheetName", () => {
  it("strips characters Excel rejects in a sheet name", () => {
    expect(safeSheetName("Paving / Grading")).toBe("Paving   Grading")
    expect(safeSheetName("Asphalt [Phase 1]")).not.toContain("[")
  })

  it("truncates to Excel's 31-character limit", () => {
    expect(safeSheetName("A".repeat(60))).toHaveLength(31)
  })

  it("falls back rather than producing an empty name", () => {
    expect(safeSheetName("   ")).toBe("Comparison")
    expect(safeSheetName("///")).toBe("Comparison")
  })
})
