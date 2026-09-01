import { describe, expect, it } from "vitest"

import { formatSelectedPages, selectSpecPages, type PdfPageText } from "./select-spec-pages.js"

// Enough characters to clear the "this page has a text layer" bar, so a
// fixture page counts as real content rather than page furniture.
function page(pageNumber: number, text: string): PdfPageText {
  return { pageNumber, text: `${text}\n${"filler text on this page. ".repeat(6)}` }
}

const GOAL_PAGE =
  "SECTION 2-1.12 DISADVANTAGED BUSINESS ENTERPRISE. The Agency has established a DBE contract goal of 18% for this project. Good faith effort documentation is required."
const LINK_PAGE =
  "NOTICE TO BIDDERS. Bid documents may be obtained at https://planroom.example.gov/bids and the directory of certified firms is available at www.dot.ca.gov/dbe."
const BOILERPLATE = "SECTION 51 CONCRETE STRUCTURES. Curing compound shall conform to the standard."

describe("selectSpecPages", () => {
  it("finds the goal clause buried in a long document", () => {
    const pages = [
      ...Array.from({ length: 200 }, (_, i) => page(i + 1, BOILERPLATE)),
      page(201, GOAL_PAGE),
      ...Array.from({ length: 200 }, (_, i) => page(i + 202, BOILERPLATE)),
    ]

    const selection = selectSpecPages(pages)

    expect(selection.isScanned).toBe(false)
    expect(selection.hasNoGoalLanguage).toBe(false)
    expect(selection.pages.map((p) => p.pageNumber)).toContain(201)
  })

  it("keeps the request bounded on a document that mentions the programme everywhere", () => {
    // A table of contents, a header on every page, cross-references — real
    // spec books say "DBE" on dozens of pages. The clause still has to win,
    // and the request still has to stay small.
    const pages = Array.from({ length: 400 }, (_, i) =>
      page(i + 1, `${BOILERPLATE} See the DBE requirements in section 2.`),
    )
    pages[250] = page(251, GOAL_PAGE)

    const selection = selectSpecPages(pages)

    expect(selection.pages.map((p) => p.pageNumber)).toContain(251)
    expect(selection.pages.length).toBeLessThanOrEqual(24)
  })

  it("includes the page after a hit, where a clause continues past the break", () => {
    const pages = [
      page(1, BOILERPLATE),
      page(2, BOILERPLATE),
      page(3, GOAL_PAGE),
      page(4, "of the total contract amount, as required by 49 CFR Part 26."),
      page(5, BOILERPLATE),
    ]

    const selection = selectSpecPages(pages)
    const numbers = selection.pages.map((p) => p.pageNumber)

    expect(numbers).toContain(3)
    expect(numbers).toContain(4)
  })

  it("picks up a where-to-obtain page that never mentions a programme", () => {
    // The link half of the feature. This page carries the planroom address
    // and no goal language at all, so goal terms alone would miss it.
    const pages = [
      page(1, BOILERPLATE),
      page(2, BOILERPLATE),
      page(3, BOILERPLATE),
      page(4, "Bid documents may be obtained at https://planroom.example.gov/bids"),
      page(5, GOAL_PAGE),
    ]

    const selection = selectSpecPages(pages)

    expect(selection.pages.map((p) => p.pageNumber)).toContain(4)
  })

  it("does not select a page whose only URL is agency furniture", () => {
    const pages = [
      page(1, BOILERPLATE),
      page(2, BOILERPLATE),
      page(3, `${BOILERPLATE} City of Example — www.example.gov`),
      page(4, GOAL_PAGE),
    ]

    const selection = selectSpecPages(pages)

    expect(selection.pages.map((p) => p.pageNumber)).not.toContain(3)
  })

  it("always includes the front matter, where the notice to bidders lives", () => {
    const pages = [
      page(1, LINK_PAGE),
      page(2, BOILERPLATE),
      ...Array.from({ length: 50 }, (_, i) => page(i + 3, BOILERPLATE)),
      page(53, GOAL_PAGE),
    ]

    const selection = selectSpecPages(pages)
    const numbers = selection.pages.map((p) => p.pageNumber)

    expect(numbers).toContain(1)
    expect(numbers).toContain(2)
  })

  it("reports a scan rather than pretending it read it", () => {
    // What a 400-page scanned spec book looks like after text extraction:
    // a stamped page number per page and nothing else.
    const pages = Array.from({ length: 400 }, (_, i) => ({
      pageNumber: i + 1,
      text: `  ${i + 1}  `,
    }))

    const selection = selectSpecPages(pages)

    expect(selection.isScanned).toBe(true)
    expect(selection.hasNoGoalLanguage).toBe(false)
    expect(selection.pages).toEqual([])
  })

  it("does not call a short text document a scan", () => {
    // The bug the first cut had: a three-page notice to bidders has little
    // text in total but is not a scan, and summing characters across the
    // document said otherwise.
    const selection = selectSpecPages([page(1, LINK_PAGE), page(2, GOAL_PAGE), page(3, BOILERPLATE)])

    expect(selection.isScanned).toBe(false)
    expect(selection.pages.map((p) => p.pageNumber)).toContain(2)
  })

  it("says a spec with no participation language has none", () => {
    const pages = Array.from({ length: 80 }, (_, i) => page(i + 1, BOILERPLATE))

    const selection = selectSpecPages(pages)

    expect(selection.hasNoGoalLanguage).toBe(true)
    expect(selection.isScanned).toBe(false)
    expect(selection.pages).toEqual([])
  })

  it("returns pages in document order and is deterministic", () => {
    const pages = [
      page(1, BOILERPLATE),
      page(2, BOILERPLATE),
      page(10, GOAL_PAGE),
      page(5, LINK_PAGE),
      page(30, "The DBE goal applies to 20 percent of the contract."),
    ]

    const first = selectSpecPages(pages).pages.map((p) => p.pageNumber)
    const second = selectSpecPages(pages).pages.map((p) => p.pageNumber)

    expect(first).toEqual([...first].sort((a, b) => a - b))
    expect(first).toEqual(second)
  })
})

describe("formatSelectedPages", () => {
  it("marks each passage with the page it came from", () => {
    const formatted = formatSelectedPages([
      { pageNumber: 4, text: "first passage" },
      { pageNumber: 91, text: "second passage" },
    ])

    expect(formatted).toBe("[PDF page 4]\nfirst passage\n\n[PDF page 91]\nsecond passage")
  })
})
