import { describe, expect, it } from "vitest"

import {
  type ComparisonInputCondition,
  type ComparisonInputQuote,
  alignRowsToColumns,
  buildComparisonGrid,
  classifyStance,
  sortColumns,
} from "@/lib/quote-comparison"

function quote(
  subQuoteId: string,
  subName: string,
  totalAmount: string | null,
): ComparisonInputQuote {
  return { subQuoteId, subName, trade: "Paving", totalAmount }
}

let conditionSeq = 0
function cond(
  subQuoteId: string,
  category: string,
  rawText: string,
  overrides: Partial<ComparisonInputCondition> = {},
): ComparisonInputCondition {
  conditionSeq += 1
  return {
    id: `c${conditionSeq}`,
    subQuoteId,
    category,
    rawText,
    normalizedValue: null,
    isConfirmed: true,
    primeCostUsd: null,
    ...overrides,
  }
}

describe("classifyStance", () => {
  it("reads the stance categories outright", () => {
    expect(classifyStance({ category: "exclusion", rawText: "anything", normalizedValue: null })).toBe(
      "excluded",
    )
    expect(classifyStance({ category: "inclusion", rawText: "anything", normalizedValue: null })).toBe(
      "included",
    )
  })

  it("reads exclusion wording on a topic category", () => {
    for (const text of [
      "Traffic control by others",
      "Excludes all traffic control",
      "Traffic control not included",
      "Traffic control is not in our scope",
      "MOT by the GC",
    ]) {
      expect(classifyStance({ category: "traffic_control", rawText: text, normalizedValue: null })).toBe(
        "excluded",
      )
    }
  })

  it("does not let 'not included' match as included", () => {
    // The single most consequential ordering bug this classifier could have.
    expect(
      classifyStance({ category: "bond", rawText: "Payment bond not included", normalizedValue: null }),
    ).toBe("excluded")
  })

  it("reads inclusion wording", () => {
    expect(
      classifyStance({ category: "bond", rawText: "Payment bond included in price", normalizedValue: null }),
    ).toBe("included")
  })

  it("treats a stated term that is neither in nor out as a value", () => {
    expect(
      classifyStance({
        category: "price_validity",
        rawText: "Price firm for 30 days from bid date",
        normalizedValue: null,
      }),
    ).toBe("value")
  })

  it("prefers the normalized restatement when there is one", () => {
    expect(
      classifyStance({
        category: "traffic_control",
        rawText: "See note 4 on the attached sheet",
        normalizedValue: "excluded",
      }),
    ).toBe("excluded")
  })
})

describe("buildComparisonGrid — cells", () => {
  it("distinguishes not stated from excluded", () => {
    // The distinction the extraction prompt insists on: silence is not refusal.
    const quotes = [quote("a", "Ace Paving", "100000"), quote("b", "Bex Paving", "95000")]
    const conditions = [cond("a", "traffic_control", "Traffic control by others")]

    const grid = buildComparisonGrid("Paving", quotes, conditions)
    const row = grid.rows.find((r) => r.category === "traffic_control")

    expect(row?.cells.find((c) => c.subQuoteId === "a")?.stance).toBe("excluded")
    expect(row?.cells.find((c) => c.subQuoteId === "b")?.stance).toBe("not_stated")
  })

  it("only creates rows for categories a sub actually raised", () => {
    const grid = buildComparisonGrid(
      "Paving",
      [quote("a", "Ace", "100")],
      [cond("a", "bond", "Bond included")],
    )
    expect(grid.rows.map((r) => r.category)).toEqual(["bond"])
  })

  it("shows a cell with mixed stances as a value rather than picking one", () => {
    const conditions = [
      cond("a", "exclusion", "Excludes dewatering"),
      cond("a", "exclusion", "Excludes rock excavation"),
    ]
    const grid = buildComparisonGrid("Paving", [quote("a", "Ace", "100")], conditions)
    expect(grid.rows[0].cells[0].stance).toBe("excluded")
    expect(grid.rows[0].cells[0].entries).toHaveLength(2)
  })
})

describe("buildComparisonGrid — gap and overlap", () => {
  const quotes = [quote("a", "Ace", "100000"), quote("b", "Bex", "95000"), quote("c", "Cove", "98000")]

  it("flags a gap when someone excluded it and nobody included it", () => {
    const grid = buildComparisonGrid("Paving", quotes, [
      cond("a", "traffic_control", "Traffic control by others"),
      cond("b", "traffic_control", "Excludes traffic control"),
    ])
    const row = grid.rows.find((r) => r.category === "traffic_control")
    expect(row?.flags).toContain("gap")
  })

  it("does not flag a gap when someone did include it", () => {
    const grid = buildComparisonGrid("Paving", quotes, [
      cond("a", "traffic_control", "Traffic control by others"),
      cond("b", "traffic_control", "Traffic control included"),
    ])
    const row = grid.rows.find((r) => r.category === "traffic_control")
    expect(row?.flags).not.toContain("gap")
  })

  it("does not flag a gap merely because nobody mentioned it", () => {
    // Silence from everyone is not a gap — it is a category no sub raised, and
    // flagging those would flag most of the grid.
    const grid = buildComparisonGrid("Paving", quotes, [cond("a", "bond", "Bond included")])
    expect(grid.rows.every((row) => !row.flags.includes("gap"))).toBe(true)
  })

  it("flags an overlap when two subs both included it", () => {
    const grid = buildComparisonGrid("Paving", quotes, [
      cond("a", "traffic_control", "Traffic control included"),
      cond("b", "traffic_control", "Traffic control included in our price"),
    ])
    const row = grid.rows.find((r) => r.category === "traffic_control")
    expect(row?.flags).toContain("overlap")
  })

  it("does not claim gap or overlap on free-text categories", () => {
    // "Excludes dewatering" and "excludes rock" are both `exclusion`, and
    // treating them as the same scope would be a guess about meaning.
    const grid = buildComparisonGrid("Paving", quotes, [
      cond("a", "exclusion", "Excludes dewatering"),
      cond("b", "exclusion", "Excludes rock excavation"),
    ])
    const row = grid.rows.find((r) => r.category === "exclusion")
    expect(row?.comparable).toBe(false)
    expect(row?.flags).toEqual([])
  })
})

describe("buildComparisonGrid — where subs differ", () => {
  it("marks a row where the columns do not all agree", () => {
    const grid = buildComparisonGrid("Paving", [quote("a", "Ace", "1"), quote("b", "Bex", "2")], [
      cond("a", "bond", "Bond included"),
      cond("b", "bond", "Bond excluded"),
    ])
    expect(grid.rows.find((r) => r.category === "bond")?.subsDiffer).toBe(true)
  })

  it("does not mark a row where every column says the same thing", () => {
    const grid = buildComparisonGrid("Paving", [quote("a", "Ace", "1"), quote("b", "Bex", "2")], [
      cond("a", "bond", "Bond included"),
      cond("b", "bond", "Bond included"),
    ])
    expect(grid.rows.find((r) => r.category === "bond")?.subsDiffer).toBe(false)
  })

  it("counts silence from one sub as a difference", () => {
    const grid = buildComparisonGrid("Paving", [quote("a", "Ace", "1"), quote("b", "Bex", "2")], [
      cond("a", "bond", "Bond included"),
    ])
    expect(grid.rows.find((r) => r.category === "bond")?.subsDiffer).toBe(true)
  })

  it("puts flagged rows first, then differing rows, then agreed rows", () => {
    const quotes = [quote("a", "Ace", "1"), quote("b", "Bex", "2")]
    const grid = buildComparisonGrid("Paving", quotes, [
      // agreed
      cond("a", "retainage", "5% retainage"),
      cond("b", "retainage", "5% retainage"),
      // gap
      cond("a", "traffic_control", "Traffic control by others"),
      cond("b", "traffic_control", "Excludes traffic control"),
      // differs, no flag
      cond("a", "bond", "Bond included"),
      cond("b", "bond", "Bond included in price"),
      cond("a", "tax", "Tax included"),
    ])

    expect(grid.rows[0].category).toBe("traffic_control")
    expect(grid.rows[grid.rows.length - 1].category).toBe("retainage")
  })
})

describe("buildComparisonGrid — pricing", () => {
  it("ranks by base price, cheapest first", () => {
    const grid = buildComparisonGrid(
      "Paving",
      [quote("a", "Ace", "100000"), quote("b", "Bex", "95000"), quote("c", "Cove", "98000")],
      [],
    )
    expect(grid.columns.find((c) => c.subQuoteId === "b")?.baseRank).toBe(1)
    expect(grid.columns.find((c) => c.subQuoteId === "c")?.baseRank).toBe(2)
    expect(grid.columns.find((c) => c.subQuoteId === "a")?.baseRank).toBe(3)
  })

  it("re-ranks once exclusions are costed — the whole point of the screen", () => {
    // Bex is cheapest on base, but excluded traffic control the prime prices
    // at $12k. Ace carried it. Adjusted, Ace is cheapest.
    const quotes = [quote("a", "Ace", "100000"), quote("b", "Bex", "95000")]
    const conditions = [
      cond("a", "traffic_control", "Traffic control included"),
      cond("b", "traffic_control", "Traffic control by others", { primeCostUsd: "12000.00" }),
    ]

    const grid = buildComparisonGrid("Paving", quotes, conditions)
    const ace = grid.columns.find((c) => c.subQuoteId === "a")
    const bex = grid.columns.find((c) => c.subQuoteId === "b")

    expect(bex?.baseRank).toBe(1)
    expect(bex?.adjustedPriceUsd).toBe(107000)
    expect(ace?.adjustedPriceUsd).toBe(100000)
    expect(ace?.adjustedRank).toBe(1)
    expect(bex?.adjustedRank).toBe(2)
  })

  it("counts uncosted exclusions so the adjusted price can be shown as provisional", () => {
    const grid = buildComparisonGrid(
      "Paving",
      [quote("a", "Ace", "100000")],
      [
        cond("a", "traffic_control", "Traffic control by others"),
        cond("a", "disposal", "Haul-off by others", { primeCostUsd: "5000" }),
      ],
    )
    const ace = grid.columns[0]
    expect(ace.uncostedExclusions).toBe(1)
    expect(ace.adjustedPriceUsd).toBe(105000)
  })

  it("does not treat an uncosted exclusion as free", () => {
    const grid = buildComparisonGrid(
      "Paving",
      [quote("a", "Ace", "100000")],
      [cond("a", "traffic_control", "Traffic control by others")],
    )
    // The adjusted figure equals base, but uncostedExclusions is what tells the
    // UI that figure is incomplete rather than final.
    expect(grid.columns[0].adjustedPriceUsd).toBe(100000)
    expect(grid.columns[0].uncostedExclusions).toBe(1)
  })

  it("leaves a quote with no printed total unranked rather than sorting it as free", () => {
    const grid = buildComparisonGrid(
      "Paving",
      [quote("a", "Ace", "100000"), quote("b", "Bex", null)],
      [],
    )
    const bex = grid.columns.find((c) => c.subQuoteId === "b")
    expect(bex?.basePriceUsd).toBeNull()
    expect(bex?.baseRank).toBeNull()
    expect(bex?.adjustedPriceUsd).toBeNull()
  })

  it("counts unverified conditions per column", () => {
    const grid = buildComparisonGrid(
      "Paving",
      [quote("a", "Ace", "1"), quote("b", "Bex", "2")],
      [
        cond("a", "bond", "Bond included", { isConfirmed: false }),
        cond("a", "tax", "Tax included", { isConfirmed: false }),
        cond("a", "disposal", "Haul included", { isConfirmed: true }),
        cond("b", "bond", "Bond included", { isConfirmed: true }),
      ],
    )
    expect(grid.columns.find((c) => c.subQuoteId === "a")?.unverifiedCount).toBe(2)
    expect(grid.columns.find((c) => c.subQuoteId === "b")?.unverifiedCount).toBe(0)
  })
})

describe("sortColumns and alignRowsToColumns", () => {
  const quotes = [quote("a", "Ace", "100000"), quote("b", "Bex", "95000")]
  const conditions = [
    cond("a", "traffic_control", "Traffic control included"),
    cond("b", "traffic_control", "Traffic control by others", { primeCostUsd: "12000" }),
  ]

  it("sorts by base or by adjusted price", () => {
    const grid = buildComparisonGrid("Paving", quotes, conditions)
    expect(sortColumns(grid.columns, "base").map((c) => c.subName)).toEqual(["Bex", "Ace"])
    expect(sortColumns(grid.columns, "adjusted").map((c) => c.subName)).toEqual(["Ace", "Bex"])
  })

  it("keeps every row's cells aligned to the column order after a sort", () => {
    const grid = buildComparisonGrid("Paving", quotes, conditions)
    const columns = sortColumns(grid.columns, "adjusted")
    const rows = alignRowsToColumns(grid.rows, columns)

    for (const row of rows) {
      expect(row.cells.map((cell) => cell.subQuoteId)).toEqual(
        columns.map((column) => column.subQuoteId),
      )
    }
  })

  it("puts unpriced quotes last without dropping them", () => {
    const grid = buildComparisonGrid(
      "Paving",
      [quote("a", "Ace", "100000"), quote("b", "Bex", null), quote("c", "Cove", "90000")],
      [],
    )
    expect(sortColumns(grid.columns, "base").map((c) => c.subName)).toEqual(["Cove", "Ace", "Bex"])
  })
})
