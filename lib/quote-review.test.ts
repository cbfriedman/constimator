import { describe, expect, it } from "vitest"

import {
  type BidQuantity,
  type ReviewableCondition,
  extractorNotesWereMuted,
  flagConditions,
  parseQuantity,
  reviewProgress,
} from "@/lib/quote-review"

function condition(overrides: Partial<ReviewableCondition> = {}): ReviewableCondition {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    category: "exclusion",
    rawText: "Traffic control by others.",
    normalizedValue: null,
    sourcePage: 1,
    boundingBox: null,
    confidence: 96,
    flagReason: null,
    isConfirmed: false,
    ...overrides,
  }
}

describe("parseQuantity", () => {
  it("reads a quantity and unit out of a sentence", () => {
    expect(parseQuantity("Price based on 1,200 TON of AC")).toEqual({ value: 1200, unit: "TON" })
  })

  it("handles decimals", () => {
    expect(parseQuantity("450.5 LF of curb")).toEqual({ value: 450.5, unit: "LF" })
  })

  it("refuses durations that merely look like quantities", () => {
    // "Price firm for 30 days" must never be compared against the bid form.
    expect(parseQuantity("Price firm for 30 days")).toBeNull()
    expect(parseQuantity("Quote valid 60 DAYS")).toBeNull()
  })

  it("returns null when there is no quantity at all", () => {
    expect(parseQuantity("Traffic control by others.")).toBeNull()
  })
})

describe("flagConditions — objective flags", () => {
  it("does not flag a clean, confident condition", () => {
    const [row] = flagConditions([condition()])
    expect(row.flags).toEqual([])
    expect(row.riskScore).toBe(0)
  })

  it("flags low confidence", () => {
    const [row] = flagConditions([condition({ confidence: 62 })])
    expect(row.flags.map((f) => f.kind)).toContain("low_confidence")
  })

  it("treats very low confidence as more severe than merely low", () => {
    const [low] = flagConditions([condition({ confidence: 65 })])
    const [veryLow] = flagConditions([condition({ confidence: 30 })])
    expect(veryLow.riskScore).toBeGreaterThan(low.riskScore)
  })

  it("does not flag confidence that is merely imperfect", () => {
    // 85% is ordinary imprecision. Flagging it would flag most of a clean quote.
    const [row] = flagConditions([condition({ confidence: 85 })])
    expect(row.flags).toEqual([])
  })

  it("flags handwriting, and does not double-report it as a note", () => {
    const [row] = flagConditions([
      condition({ flagReason: "This line is handwritten in the margin." }),
    ])
    expect(row.flags.map((f) => f.kind)).toEqual(["handwritten"])
  })

  it("keeps the model's note when it is discriminating", () => {
    const rows = flagConditions([
      condition({ id: "a", flagReason: "Wording is ambiguous." }),
      condition({ id: "b" }),
      condition({ id: "c" }),
      condition({ id: "d" }),
    ])
    expect(rows.find((r) => r.id === "a")?.flags.map((f) => f.kind)).toEqual(["extractor_note"])
  })
})

describe("flagConditions — quantity mismatch", () => {
  const bidQuantities: BidQuantity[] = [
    { itemNumber: "12", unit: "TON", officialQuantity: 1450 },
    { itemNumber: "13", unit: "LF", officialQuantity: 900 },
  ]

  it("flags a quantity assumption that contradicts the bid form", () => {
    const [row] = flagConditions(
      [
        condition({
          category: "quantity_assumption",
          rawText: "Price based on 1,200 TON of AC",
        }),
      ],
      bidQuantities,
    )
    const flag = row.flags.find((f) => f.kind === "quantity_mismatch")
    expect(flag).toBeDefined()
    expect(flag?.detail).toContain("1,200 TON")
    expect(flag?.detail).toContain("1,450 TON")
    expect(flag?.detail).toContain("bid item 12")
  })

  it("does not flag a quantity that matches within tolerance", () => {
    const [row] = flagConditions(
      [condition({ category: "quantity_assumption", rawText: "Based on 1450 TON" })],
      bidQuantities,
    )
    expect(row.flags).toEqual([])
  })

  it("does not compare units the bid form does not have", () => {
    const [row] = flagConditions(
      [condition({ category: "quantity_assumption", rawText: "Includes 40 CY of import" })],
      bidQuantities,
    )
    expect(row.flags).toEqual([])
  })

  it("only compares quantity assumptions, not any condition containing a number", () => {
    // A minimum charge of "$1,200 TON-equivalent" is not a takeoff claim.
    const [row] = flagConditions(
      [condition({ category: "minimum_charge", rawText: "Minimum 1,200 TON per mobilization" })],
      bidQuantities,
    )
    expect(row.flags.some((f) => f.kind === "quantity_mismatch")).toBe(false)
  })

  it("agrees when the quote matches any same-unit bid line", () => {
    const manyTonItems: BidQuantity[] = [
      { itemNumber: "12", unit: "TON", officialQuantity: 1450 },
      { itemNumber: "14", unit: "TON", officialQuantity: 1200 },
    ]
    const [row] = flagConditions(
      [condition({ category: "quantity_assumption", rawText: "Based on 1,200 TON" })],
      manyTonItems,
    )
    expect(row.flags).toEqual([])
  })
})

describe("flagConditions — the noise guard", () => {
  it("mutes the model's notes when it flagged nearly everything", () => {
    // A uniformly bad fax: the extractor notes every row, which tells an
    // estimator nothing about where to look.
    const conditions = Array.from({ length: 10 }, (_, i) =>
      condition({ id: `c${i}`, flagReason: "Faded text, hard to read." }),
    )
    expect(extractorNotesWereMuted(conditions)).toBe(true)

    const rows = flagConditions(conditions)
    expect(rows.every((row) => row.flags.length === 0)).toBe(true)
  })

  it("never mutes objective flags, however many rows carry them", () => {
    // If the whole document really is unreadable, saying so is correct.
    const conditions = Array.from({ length: 10 }, (_, i) =>
      condition({ id: `c${i}`, confidence: 40, flagReason: "Faded text." }),
    )
    const rows = flagConditions(conditions)
    expect(rows.every((row) => row.flags.some((f) => f.kind === "low_confidence"))).toBe(true)
  })

  it("keeps notes when only some rows carry them", () => {
    const conditions = [
      ...Array.from({ length: 7 }, (_, i) => condition({ id: `clean${i}` })),
      ...Array.from({ length: 3 }, (_, i) =>
        condition({ id: `noted${i}`, flagReason: "Ambiguous phrasing." }),
      ),
    ]
    expect(extractorNotesWereMuted(conditions)).toBe(false)
    const rows = flagConditions(conditions)
    expect(rows.filter((row) => row.flags.length > 0)).toHaveLength(3)
  })
})

describe("flagConditions — ordering", () => {
  it("puts unconfirmed flagged rows first and confirmed rows last", () => {
    const rows = flagConditions([
      condition({ id: "confirmed-risky", confidence: 20, isConfirmed: true }),
      condition({ id: "clean" }),
      condition({ id: "risky", confidence: 30 }),
      condition({ id: "mildly-risky", confidence: 65 }),
    ])

    expect(rows.map((r) => r.id)).toEqual(["risky", "mildly-risky", "clean", "confirmed-risky"])
  })
})

describe("reviewProgress", () => {
  it("reports the completion label the UI shows", () => {
    const conditions = flagConditions([
      ...Array.from({ length: 14 }, (_, i) => condition({ id: `done${i}`, isConfirmed: true })),
      ...Array.from({ length: 4 }, (_, i) => condition({ id: `todo${i}` })),
    ])
    const progress = reviewProgress(conditions)

    expect(progress.label).toBe("14 of 18 confirmed")
    expect(progress.confirmed).toBe(14)
    expect(progress.total).toBe(18)
    expect(progress.isComplete).toBe(false)
  })

  it("counts only unconfirmed flagged rows as remaining risk", () => {
    const conditions = flagConditions([
      condition({ id: "a", confidence: 30, isConfirmed: true }),
      condition({ id: "b", confidence: 30 }),
      condition({ id: "c" }),
    ])
    expect(reviewProgress(conditions).flaggedRemaining).toBe(1)
  })

  it("is not complete when there is nothing to review", () => {
    expect(reviewProgress([]).isComplete).toBe(false)
  })
})
