import { describe, expect, it } from "vitest"

import {
  bidRowsFromExtractedItems,
  filterSkipped,
  itemKey,
  itemKeys,
  pendingBidFormExtractions,
} from "@/lib/bid-form-import"
import type { ExtractedBidItem } from "@/lib/cost-engine/types"

const job = {
  id: "job-1",
  documentId: "doc-1",
  status: "complete",
  createdAt: new Date("2026-09-01"),
  result: {
    kind: "bid_form",
    bidItems: [
      {
        itemNumber: "1",
        description: "Mobilization",
        unit: "LS",
        quantity: 1,
        specSection: "00 73 00",
        confidence: 94,
      },
    ],
  },
}

describe("pendingBidFormExtractions", () => {
  it("returns complete bid-form jobs that have not been imported", () => {
    const pending = pendingBidFormExtractions(
      [job],
      [{ id: "doc-1", fileName: "bid-form.pdf" }],
      [],
    )
    expect(pending).toHaveLength(1)
    expect(pending[0]?.fileName).toBe("bid-form.pdf")
    expect(pending[0]?.items[0]?.description).toBe("Mobilization")
  })

  it("skips documents that already have bid rows", () => {
    const pending = pendingBidFormExtractions(
      [job],
      [{ id: "doc-1", fileName: "bid-form.pdf" }],
      [{ documentId: "doc-1" }],
    )
    expect(pending).toHaveLength(0)
  })

  it("ignores plan takeoff results", () => {
    const pending = pendingBidFormExtractions(
      [
        {
          ...job,
          result: { kind: "plan_takeoff", bidItems: job.result.bidItems },
        },
      ],
      [{ id: "doc-1", fileName: "plans.pdf" }],
      [],
    )
    expect(pending).toHaveLength(0)
  })

  // A retry inserts a second job row rather than resetting the first, so a
  // document routinely has more than one — the newest is the one that
  // reflects what the extractor currently believes.
  it("uses the newest job when a document has been retried", () => {
    const older = {
      ...job,
      id: "job-0",
      createdAt: new Date("2026-08-01"),
      result: {
        kind: "bid_form",
        bidItems: [{ ...job.result.bidItems[0]!, description: "Stale read" }],
      },
    }

    const pending = pendingBidFormExtractions(
      [job, older],
      [{ id: "doc-1", fileName: "bid-form.pdf" }],
      [],
    )
    expect(pending).toHaveLength(1)
    expect(pending[0]?.items).toHaveLength(1)
    expect(pending[0]?.items[0]?.description).toBe("Mobilization")
  })

  it("ignores jobs that have not finished", () => {
    for (const status of ["failed", "queued", "running"]) {
      const pending = pendingBidFormExtractions(
        [{ ...job, status }],
        [{ id: "doc-1", fileName: "bid-form.pdf" }],
        [],
      )
      expect(pending, `status ${status}`).toHaveLength(0)
    }
  })

  it("does not offer an extraction that read no items", () => {
    const pending = pendingBidFormExtractions(
      [{ ...job, result: { kind: "bid_form", bidItems: [] } }],
      [{ id: "doc-1", fileName: "bid-form.pdf" }],
      [],
    )
    expect(pending).toHaveLength(0)
  })

  // All-or-nothing on purpose. A model that dropped a field on one line may
  // well have misread its neighbours too, so showing the rest as a clean
  // preview would hide the damage — better to offer nothing and let the
  // contractor retry or type the form.
  it("rejects the whole extraction when any item is malformed", () => {
    const malformed = { itemNumber: "2", unit: "LF", quantity: 655 }
    const pending = pendingBidFormExtractions(
      [
        {
          ...job,
          result: {
            kind: "bid_form",
            bidItems: [
              job.result.bidItems[0]!,
              malformed as unknown as ExtractedBidItem,
            ],
          },
        },
      ],
      [{ id: "doc-1", fileName: "bid-form.pdf" }],
      [],
    )
    expect(pending).toHaveLength(0)
  })
})

describe("bidRowsFromExtractedItems", () => {
  it("maps extracted items onto bid-table columns", () => {
    const [row] = bidRowsFromExtractedItems(
      [
        {
          itemNumber: "8",
          description: '18" RCP Class III',
          unit: "LF",
          quantity: 655,
          specSection: "71-2",
          confidence: 88,
        },
      ],
      "doc-1",
    )
    expect(row).toMatchObject({
      documentId: "doc-1",
      itemNumber: "8",
      officialQuantity: "655",
      specSection: "71-2",
      extractionConfidence: "88",
    })
  })

  // bids.extraction_confidence is a numeric column, so Drizzle wants a
  // string going in — and a row the extractor gave no score to has to stay
  // null rather than become "0", which would read as "certainly wrong".
  it("carries confidence as a string and keeps an unscored item null", () => {
    const rows = bidRowsFromExtractedItems(
      [
        job.result.bidItems[0]!,
        { itemNumber: "2", description: "Clearing", unit: "AC", quantity: 3 },
      ],
      "doc-1",
    )
    expect(rows[0]?.extractionConfidence).toBe("94")
    expect(rows[1]?.extractionConfidence).toBeNull()
  })
})

const items = [
  job.result.bidItems[0]!,
  { itemNumber: "2", description: "Clearing", unit: "AC", quantity: 3 },
  { itemNumber: "3", description: "Roadway excavation", unit: "CY", quantity: 1200 },
]

describe("filterSkipped", () => {
  it("keeps every item when nothing is skipped", () => {
    expect(filterSkipped(items, new Set())).toEqual(items)
  })

  it("drops only the skipped item", () => {
    const keys = itemKeys(items)
    const kept = filterSkipped(items, new Set([keys[1]!]))
    expect(kept).toHaveLength(2)
    expect(kept.map((item) => item.itemNumber)).toEqual(["1", "3"])
  })

  it("returns an empty list when every item is skipped", () => {
    expect(filterSkipped(items, new Set(itemKeys(items)))).toEqual([])
  })
})

describe("itemKey", () => {
  it("gives duplicate rows distinct keys", () => {
    const duplicate = { ...items[0]! }
    const keys = itemKeys([items[0]!, duplicate, items[1]!])
    expect(new Set(keys).size).toBe(3)
  })

  // The point of the fallback: skipping one of two identical rows has to
  // leave the other one in, or the checkbox silently drops both.
  it("skips only one of two identical rows", () => {
    const pair = [items[0]!, { ...items[0]! }]
    const keys = itemKeys(pair)
    expect(filterSkipped(pair, new Set([keys[0]!]))).toHaveLength(1)
  })

  it("uses item number and description when they are unique", () => {
    expect(itemKey(items[0]!, 0)).toBe("1::Mobilization")
    expect(itemKey(items[0]!, 4, new Set(["1::Mobilization"]))).toBe("4")
  })
})
