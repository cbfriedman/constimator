import { describe, expect, it } from "vitest"

import type { bids, estimateLines, planCallouts } from "@/db/schema"
import { draftSheetRfi } from "./rfi-draft"
import { buildSheetMatrix, compareSheetNumbers, formatPct, formatSignedQty } from "./sheet-matrix"

type BidRow = typeof bids.$inferSelect
type PlanCalloutRow = typeof planCallouts.$inferSelect
type EstimateLineRow = typeof estimateLines.$inferSelect

const AT = new Date("2026-01-01T00:00:00.000Z")

let bidCounter = 0
function makeBid(overrides: Partial<BidRow> = {}): BidRow {
  bidCounter += 1
  return {
    id: `bid-${bidCounter}`,
    orgId: "org-1",
    projectId: "project-1",
    documentId: null,
    itemNumber: String(bidCounter),
    description: "Roadway Excavation",
    unit: "CY",
    officialQuantity: "8450.00",
    specSection: null,
    extractionConfidence: null,
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  }
}

let calloutCounter = 0
function makeCallout(overrides: Partial<PlanCalloutRow> = {}): PlanCalloutRow {
  calloutCounter += 1
  return {
    id: `callout-${calloutCounter}`,
    orgId: "org-1",
    projectId: "project-1",
    documentId: "doc-1",
    bidId: null,
    sheetNumber: "C-301",
    sheetTitle: null,
    pageNumber: 12,
    description: '18" RCP',
    quantity: "655.00",
    unit: "LF",
    sourceText: "SD-1: 220 LF, SD-2: 185 LF, SD-3: 250 LF",
    sourceKind: "schedule",
    aiBidItemNumber: null,
    matchSource: null,
    confidence: "90.00",
    notes: null,
    dismissed: false,
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  }
}

function makeLine(overrides: Partial<EstimateLineRow> = {}): EstimateLineRow {
  return {
    id: "line-1",
    orgId: "org-1",
    estimateId: "estimate-1",
    bidId: null,
    lineNumber: 1,
    description: "Roadway Excavation",
    note: null,
    quantity: "8450.00",
    unit: "CY",
    unitPrice: "14.20",
    laborCost: null,
    materialCost: null,
    equipmentCost: null,
    subCost: null,
    markupPct: "10",
    total: "119990.00",
    source: "manual",
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  }
}

const documents = [{ id: "doc-1", fileName: "plans.pdf" }]

describe("compareSheetNumbers", () => {
  it("orders sheet numbers the way a set is bound", () => {
    expect(["C-201", "C-102", "Page 10", "C-101", "Page 3"].sort(compareSheetNumbers)).toEqual([
      "C-101",
      "C-102",
      "C-201",
      "Page 3",
      "Page 10",
    ])
  })
})

describe("buildSheetMatrix", () => {
  it("flags a sheet whose stated quantity differs from the bid form", () => {
    const rcp = makeBid({ id: "bid-rcp", itemNumber: "8", description: '18" RCP Class III', unit: "LF", officialQuantity: "640.00" })
    const matrix = buildSheetMatrix({
      bidRows: [rcp],
      calloutRows: [makeCallout({ bidId: "bid-rcp", matchSource: "ai" })],
      takeoffItems: [],
      estimateLineRows: [],
      documents,
    })

    expect(matrix.bySheet).toHaveLength(1)
    const [cell] = matrix.bySheet[0].cells
    expect(cell.status).toBe("discrepancy")
    expect(cell.officialQty).toBe(640)
    expect(cell.statedQty).toBe(655)
    expect(cell.diffQty).toBe(15)
    expect(cell.diffPct).toBeCloseTo(2.34, 2)
    expect(cell.description).toBe('18" RCP Class III')
    expect(cell.calloutDescription).toBe('18" RCP')
    expect(matrix.stats.discrepancyCount).toBe(1)
    expect(matrix.byItem[0].status).toBe("discrepancy")
  })

  it("treats the same quantity as a match", () => {
    const bid = makeBid({ id: "bid-1", officialQuantity: "655.00", unit: "LF" })
    const matrix = buildSheetMatrix({
      bidRows: [bid],
      calloutRows: [makeCallout({ bidId: "bid-1" })],
      takeoffItems: [],
      estimateLineRows: [],
      documents,
    })
    expect(matrix.bySheet[0].cells[0].status).toBe("match")
    expect(matrix.byItem[0].status).toBe("match")
  })

  it("keeps a callout nobody claims as an unlinked row, not a lost one", () => {
    const matrix = buildSheetMatrix({
      bidRows: [makeBid()],
      calloutRows: [makeCallout({ description: "Dewatering", unit: "LS", quantity: "1" })],
      takeoffItems: [],
      estimateLineRows: [],
      documents,
    })
    expect(matrix.unlinked).toHaveLength(1)
    expect(matrix.unlinked[0].status).toBe("unlinked")
    expect(matrix.unlinked[0].description).toBe("Dewatering")
    expect(matrix.stats.unlinkedCount).toBe(1)
    // Still on its sheet, so the by-sheet view shows it where it was read.
    expect(matrix.bySheet[0].cells).toHaveLength(1)
  })

  it("does not compare quantities against a lump-sum item", () => {
    const mob = makeBid({ id: "bid-mob", description: "Mobilization", unit: "L.S.", officialQuantity: "1.00" })
    const matrix = buildSheetMatrix({
      bidRows: [mob],
      calloutRows: [makeCallout({ bidId: "bid-mob", quantity: "3", unit: "EA", description: "Staging areas" })],
      takeoffItems: [],
      estimateLineRows: [],
      documents,
    })
    expect(matrix.bySheet[0].cells[0].status).toBe("lump_sum")
    expect(matrix.bySheet[0].cells[0].diffQty).toBeNull()
    expect(matrix.byItem[0].status).toBe("lump_sum")
    expect(matrix.stats.discrepancyCount).toBe(0)
  })

  it("lists bid items no sheet states, so the contractor knows which to count themselves", () => {
    const matrix = buildSheetMatrix({
      bidRows: [makeBid({ id: "bid-a" }), makeBid({ id: "bid-b" })],
      calloutRows: [makeCallout({ bidId: "bid-a", unit: "CY", quantity: "8450" })],
      takeoffItems: [],
      estimateLineRows: [],
      documents,
    })
    expect(matrix.byItem.map((item) => item.status)).toEqual(["match", "no_callouts"])
    expect(matrix.stats.itemsWithoutCalloutsCount).toBe(1)
  })

  it("hides dismissed callouts from both groupings but reports them", () => {
    const matrix = buildSheetMatrix({
      bidRows: [makeBid({ id: "bid-1" })],
      calloutRows: [makeCallout({ bidId: "bid-1", dismissed: true })],
      takeoffItems: [],
      estimateLineRows: [],
      documents,
    })
    expect(matrix.bySheet).toHaveLength(0)
    expect(matrix.byItem[0].cells).toHaveLength(0)
    expect(matrix.dismissed).toHaveLength(1)
  })

  it("sums the AI takeoff's matching items onto the bid item", () => {
    const rcp = makeBid({ id: "bid-rcp", description: 'Reinforced Concrete Pipe, 18", Class III', unit: "LF", officialQuantity: "640" })
    const matrix = buildSheetMatrix({
      bidRows: [rcp],
      calloutRows: [],
      takeoffItems: [
        { trade: "Storm Drain", description: '18" RCP CL III', quantity: 400, unit: "LF", confidence: 80, sourceSheets: "C-301" },
        { trade: "Storm Drain", description: '18" RCP culvert', quantity: 250, unit: "LF", confidence: 65, sourceSheets: "C-302" },
        { trade: "Storm Drain", description: '24" RCP', quantity: 100, unit: "LF", confidence: 90 },
        { trade: "General", description: "Nothing legible", quantity: 0, unit: "LS", notes: "blank scan" },
      ],
      estimateLineRows: [],
      documents,
    })
    const [item] = matrix.byItem
    expect(item.aiTakeoffQty).toBe(650)
    expect(item.aiTakeoffSheets).toBe("C-301; C-302")
    expect(item.aiTakeoffConfidence).toBe(65)
  })

  it("reads the estimator's quantity off the linked estimate line, or an unambiguous description match", () => {
    const linked = makeBid({ id: "bid-linked", description: "Cold Plane AC", unit: "SY", officialQuantity: "12300" })
    const byName = makeBid({ id: "bid-name", description: "Roadway Excavation", unit: "CY" })
    const matrix = buildSheetMatrix({
      bidRows: [linked, byName],
      calloutRows: [],
      takeoffItems: [],
      estimateLineRows: [
        makeLine({ id: "line-linked", bidId: "bid-linked", description: "Grind", quantity: "12500", unit: "SY" }),
        makeLine({ id: "line-name", description: "roadway excavation", quantity: "8000" }),
      ],
      documents,
    })
    const [first, second] = matrix.byItem
    expect(first.estimateLineId).toBe("line-linked")
    expect(first.estimateQty).toBe(12500)
    expect(second.estimateLineId).toBe("line-name")
    expect(second.estimateQty).toBe(8000)
  })

  it("keeps a sheet number from two plan sets apart", () => {
    const matrix = buildSheetMatrix({
      bidRows: [],
      calloutRows: [
        makeCallout({ documentId: "doc-1" }),
        makeCallout({ documentId: "doc-2" }),
      ],
      takeoffItems: [],
      estimateLineRows: [],
      documents: [...documents, { id: "doc-2", fileName: "plans-rev1.pdf" }],
    })
    expect(matrix.bySheet).toHaveLength(2)
    expect(matrix.bySheet.map((g) => g.documentName)).toEqual(["plans-rev1.pdf", "plans.pdf"])
  })

  it("orders a sheet's rows in bid-form order with unlinked rows last", () => {
    const matrix = buildSheetMatrix({
      bidRows: [
        makeBid({ id: "bid-10", itemNumber: "10", unit: "LF" }),
        makeBid({ id: "bid-2", itemNumber: "2", unit: "LF" }),
      ],
      calloutRows: [
        makeCallout({ description: "Zebra crossing", unit: "EA" }),
        makeCallout({ bidId: "bid-10" }),
        makeCallout({ bidId: "bid-2" }),
      ],
      takeoffItems: [],
      estimateLineRows: [],
      documents,
    })
    expect(matrix.bySheet[0].cells.map((c) => c.itemNumber)).toEqual(["2", "10", null])
  })
})

describe("formatting", () => {
  it("signs a diff and a percentage the way the reconciliation table does", () => {
    expect(formatSignedQty(15)).toBe("+15")
    expect(formatSignedQty(-1234.5)).toBe("−1,234.5")
    expect(formatSignedQty(0)).toBe("0")
    expect(formatPct(2.34)).toBe("+2.3%")
    expect(formatPct(-0.02)).toBe("0%")
    expect(formatPct(null)).toBe("—")
  })
})

describe("draftSheetRfi", () => {
  it("cites the bid item, the sheet, and the sheet's own text for a discrepancy", () => {
    const rcp = makeBid({ id: "bid-rcp", itemNumber: "8", description: '18" RCP Class III', unit: "LF", officialQuantity: "640" })
    const matrix = buildSheetMatrix({
      bidRows: [rcp],
      calloutRows: [makeCallout({ bidId: "bid-rcp", sheetTitle: "Storm Drain Profile" })],
      takeoffItems: [],
      estimateLineRows: [],
      documents,
    })
    const draft = draftSheetRfi(matrix.bySheet[0].cells[0])
    expect(draft.title).toBe('Quantity discrepancy: 18" RCP Class III')
    expect(draft.body).toContain('Bid Item 8 (18" RCP Class III) lists a quantity of 640 LF')
    expect(draft.body).toContain("Sheet C-301 (Storm Drain Profile) shows 655 LF")
    expect(draft.body).toContain('"SD-1: 220 LF, SD-2: 185 LF, SD-3: 250 LF"')
    expect(draft.body).toContain("exceeds the bid quantity by a difference of 15 LF (2.3%)")
  })

  it("asks whether an unlisted quantity is incidental or a missing pay item", () => {
    const matrix = buildSheetMatrix({
      bidRows: [],
      calloutRows: [makeCallout({ description: "Dewatering", unit: "LS", quantity: "1", sourceKind: "note", sourceText: "Contractor shall dewater as required." })],
      takeoffItems: [],
      estimateLineRows: [],
      documents,
    })
    const draft = draftSheetRfi(matrix.unlinked[0])
    expect(draft.title).toBe("Missing bid item: Dewatering")
    expect(draft.body).toContain("Sheet C-301 shows 1 LS of Dewatering in a general note")
    expect(draft.body).toContain("unable to locate a corresponding pay item")
  })
})
