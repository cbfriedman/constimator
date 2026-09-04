import { describe, expect, it } from "vitest"

import {
  bidRowsFromExtractedItems,
  pendingBidFormExtractions,
} from "@/lib/bid-form-import"

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
})
