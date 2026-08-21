import { describe, expect, it } from "vitest"

import { findTextInItems, normalizeText, type PdfTextItem } from "@/lib/pdf-text-match"

/** pdf.js hands back one item per run of text, which is often a word or part of one. */
function items(...strings: string[]): PdfTextItem[] {
  return strings.map((str) => ({ str }))
}

describe("normalizeText", () => {
  it("folds smart quotes, dashes and ligatures to their plain forms", () => {
    expect(normalizeText("“Traffic control” — by others")).toBe('"traffic control" - by others')
    expect(normalizeText("ﬁnal")).toBe("final")
  })

  it("collapses whitespace, including the line breaks the extractor joins", () => {
    expect(normalizeText("Traffic\n  control   by\tothers")).toBe("traffic control by others")
  })

  it("strips zero-width and soft-hyphen characters", () => {
    expect(normalizeText("Traf­fic​control")).toBe("trafficcontrol")
  })
})

describe("findTextInItems — exact matching", () => {
  it("finds a phrase spread across several text items", () => {
    const page = items("Traffic", "control", "by", "others.", "Bond", "not", "included.")
    const match = findTextInItems(page, "Traffic control by others.")

    expect(match?.quality).toBe("exact")
    expect(match?.score).toBe(1)
    expect(match?.itemIndices).toEqual([0, 1, 2, 3])
  })

  it("finds a phrase inside a single item", () => {
    const page = items("All work per plan. Traffic control by others. Price firm 30 days.")
    const match = findTextInItems(page, "Traffic control by others.")
    expect(match?.quality).toBe("exact")
    expect(match?.itemIndices).toEqual([0])
  })

  it("matches when the extractor joined a line break with a space", () => {
    // Exactly what the extraction prompt instructs it to do.
    const page = items("Mobilization is", "limited to two", "trips to the site.")
    const match = findTextInItems(page, "Mobilization is limited to two trips to the site.")
    expect(match?.quality).toBe("exact")
    expect(match?.itemIndices).toEqual([0, 1, 2])
  })

  it("matches through punctuation differences", () => {
    const page = items("Price firm for thirty (30) days from bid date")
    const match = findTextInItems(page, "Price firm for thirty 30 days from bid date")
    expect(match?.quality).toBe("exact")
  })

  it("matches a word the PDF split across two items", () => {
    // A real and common text-layer artefact: "Traffic" emitted as "Traf"+"fic".
    const page = items("Traf", "fic", "control", "by", "others")
    const match = findTextInItems(page, "Traffic control by others")
    expect(match?.quality).toBe("exact")
    expect(match?.itemIndices).toEqual([0, 1, 2, 3, 4])
  })

  it("does not weld adjacent items into one word when matching normally", () => {
    // "Bond" + "not" must not become "Bondnot" and match a query for it.
    const page = items("Bond", "not", "included")
    expect(findTextInItems(page, "Bondnot included")).not.toBeNull() // squashed pass, legitimately
    expect(findTextInItems(page, "Bond not included")?.quality).toBe("exact")
  })
})

describe("findTextInItems — refusing to match", () => {
  it("returns null when the text is simply not on the page", () => {
    const page = items("Traffic control by others.", "Bond not included.")
    expect(findTextInItems(page, "Prevailing wage rates apply to all work")).toBeNull()
  })

  it("returns null for an empty query or an empty page", () => {
    expect(findTextInItems(items("anything"), "")).toBeNull()
    expect(findTextInItems(items("anything"), "   ")).toBeNull()
    expect(findTextInItems([], "Traffic control")).toBeNull()
  })

  it("refuses when the same text appears more than once on the page", () => {
    // The words are genuinely there — twice. Which one the condition was read
    // from is unknowable, so highlighting either would be a coin flip dressed
    // up as a fact. A repeated row in a schedule is the real-world case.
    const page = items(
      "Traffic",
      "control",
      "by",
      "others.",
      "Item",
      "14:",
      "Traffic",
      "control",
      "by",
      "others.",
    )
    expect(findTextInItems(page, "Traffic control by others.")).toBeNull()
  })

  it("still matches a phrase that is repeated elsewhere only in part", () => {
    // "traffic control" recurs, but the full condition does not.
    const page = items(
      "Traffic",
      "control",
      "by",
      "others",
      "except",
      "flagging.",
      "See",
      "traffic",
      "control",
      "plan.",
    )
    const match = findTextInItems(page, "Traffic control by others except flagging.")
    expect(match?.quality).toBe("exact")
  })

  it("refuses a short query on the fuzzy path", () => {
    // Too few tokens for agreement to mean anything.
    const page = items("The", "scope", "of", "supply", "is", "as", "described")
    expect(findTextInItems(page, "scope of delivery")).toBeNull()
  })

  it("refuses a page that merely reuses the same common words out of order", () => {
    const page = items(
      "Insurance",
      "certificates",
      "provided",
      "on",
      "request",
      "for",
      "the",
      "work",
    )
    const match = findTextInItems(
      page,
      "Prevailing wage certified payroll submitted weekly for the work",
    )
    expect(match).toBeNull()
  })
})

describe("findTextInItems — fuzzy matching", () => {
  it("matches a long phrase with one transcribed word wrong, and says it is fuzzy", () => {
    const page = items(
      "Excludes",
      "all",
      "traffic",
      "control",
      "signage",
      "and",
      "flagging",
      "personnel",
    )
    const match = findTextInItems(
      page,
      "Excludes all traffic control signage and flagger personnel",
    )

    expect(match?.quality).toBe("fuzzy")
    expect(match?.score).toBeGreaterThanOrEqual(0.7)
    expect(match?.score).toBeLessThan(1)
  })

  it("tolerates an extra word the PDF carries but the quote text does not", () => {
    const page = items(
      "Excludes",
      "all",
      "traffic",
      "control",
      "(including",
      "signage",
      "and",
      "flagging)",
    )
    const match = findTextInItems(page, "Excludes all traffic control signage and flagging")
    expect(match).not.toBeNull()
  })

  it("still refuses when too many words are missing", () => {
    const page = items("Excludes", "traffic", "control")
    const match = findTextInItems(
      page,
      "Excludes traffic control signage flagging personnel barricades and detour plans",
    )
    expect(match).toBeNull()
  })
})

describe("findTextInItems — the highlight is always mappable", () => {
  it("only ever returns indices that exist in the items array", () => {
    const page = items("Traffic", "control", "by", "others")
    const match = findTextInItems(page, "control by others")

    expect(match).not.toBeNull()
    for (const index of match?.itemIndices ?? []) {
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(page.length)
    }
  })

  it("returns indices in ascending order", () => {
    const page = items("a", "Traffic", "control", "by", "others", "z")
    const match = findTextInItems(page, "Traffic control by others")
    const indices = match?.itemIndices ?? []
    expect([...indices].sort((x, y) => x - y)).toEqual(indices)
  })
})
