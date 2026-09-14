import { describe, expect, it } from "vitest"

import { batchPages, PAGES_PER_CALL } from "./extract-plan-callouts.js"

describe("batchPages", () => {
  it("splits pages into consecutive batches of the given size", () => {
    expect(batchPages([1, 2, 3, 4, 5, 6, 7, 8, 9], 4)).toEqual([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9],
    ])
  })

  it("keeps page order inside and across batches", () => {
    const pages = Array.from({ length: 20 }, (_, i) => ({ pageNumber: i + 1 }))
    const flattened = batchPages(pages, PAGES_PER_CALL).flat()
    expect(flattened).toEqual(pages)
  })

  it("returns no batches for no pages", () => {
    expect(batchPages([], PAGES_PER_CALL)).toEqual([])
  })

  it("rejects a batch size that would never terminate", () => {
    expect(() => batchPages([1], 0)).toThrow()
  })
})
