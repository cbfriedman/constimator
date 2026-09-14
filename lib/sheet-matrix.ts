import type { bids, estimateLines, planCallouts } from "@/db/schema"
import type { ExtractedTakeoffItem } from "@/lib/cost-engine/types"
import { matchBidItem } from "@/lib/plan-callout-match"

// The sheet-by-sheet reconciliation matrix's view model. Pure: takes the
// project's rows and returns the same cells grouped two ways, so the page
// can flip between "what does each sheet say" and "what do the sheets say
// about each item" without a second query.
//
// The grain is (sheet × bid item), which is what plan_callout stores. A
// bid item spans many sheets and a sheet lists many items, so neither axis
// alone is the row — the two groupings below are the two ways of walking
// the same cells.

type BidRow = typeof bids.$inferSelect
type PlanCalloutRow = typeof planCallouts.$inferSelect
type EstimateLineRow = typeof estimateLines.$inferSelect

export type CellStatus = "match" | "discrepancy" | "unlinked" | "lump_sum"
export type ItemStatus = "match" | "discrepancy" | "no_callouts" | "lump_sum"

export type SheetMatrixCell = {
  calloutId: string
  documentId: string
  documentName: string
  sheetNumber: string
  sheetTitle: string | null
  pageNumber: number | null
  bidId: string | null
  itemNumber: string | null
  /** The bid form's wording when linked, the sheet's own otherwise. */
  description: string
  /** Always the sheet's own wording — shown beside the bid's when they differ. */
  calloutDescription: string
  unit: string
  calloutUnit: string
  officialQty: number | null
  statedQty: number
  /** stated − official; null when there's nothing to compare against. */
  diffQty: number | null
  diffPct: number | null
  status: CellStatus
  sourceText: string
  sourceKind: string
  confidence: number | null
  notes: string | null
  matchSource: PlanCalloutRow["matchSource"]
  dismissed: boolean
}

export type SheetGroup = {
  key: string
  sheetNumber: string
  sheetTitle: string | null
  documentName: string
  cells: SheetMatrixCell[]
  discrepancyCount: number
}

export type ItemSummary = {
  bidId: string
  itemNumber: string
  description: string
  unit: string
  officialQty: number
  /** Sum of the AI takeoff's items this bid item matched, or null if none did. */
  aiTakeoffQty: number | null
  aiTakeoffSheets: string | null
  aiTakeoffConfidence: number | null
  estimateLineId: string | null
  estimateQty: number | null
  cells: SheetMatrixCell[]
  status: ItemStatus
}

export type SheetMatrix = {
  bySheet: SheetGroup[]
  byItem: ItemSummary[]
  /** Callouts no bid item claims — the "on the plans, not on the bid form" rows. */
  unlinked: SheetMatrixCell[]
  dismissed: SheetMatrixCell[]
  stats: {
    sheetCount: number
    cellCount: number
    discrepancyCount: number
    unlinkedCount: number
    itemsWithoutCalloutsCount: number
  }
}

type DocumentLike = { id: string; fileName: string }

function toNumber(value: string | null): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function isLumpSum(unit: string): boolean {
  return unit.trim().toLowerCase().replace(/[^a-z]/g, "") === "ls"
}

// Quantities are numeric(14,2) on both sides, so anything under half a
// hundredth is the same number.
function sameQuantity(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005
}

// "C-101" before "C-102" before "C-201"; "Page 3" before "Page 10".
export function compareSheetNumbers(a: string, b: string): number {
  return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" })
}

export function formatQty(value: number | null): string {
  if (value == null) return "—"
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

export function formatSignedQty(value: number | null): string {
  if (value == null) return "—"
  if (sameQuantity(value, 0)) return "0"
  const sign = value > 0 ? "+" : "−"
  return `${sign}${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
}

export function formatPct(value: number | null): string {
  if (value == null) return "—"
  if (Math.abs(value) < 0.05) return "0%"
  const sign = value > 0 ? "+" : "−"
  return `${sign}${Math.abs(value).toFixed(1)}%`
}

/**
 * Same rule as lib/reconciliation-diff.ts's matchEstimateLine: the explicit
 * bidId link first, then an exact description match only when it's
 * unambiguous. Duplicated rather than imported because that module's
 * helper is private to the diff and this one needs the line, not a diff.
 */
function estimateLineForBid(bid: BidRow, lines: EstimateLineRow[]): EstimateLineRow | undefined {
  const byBidId = lines.find((line) => line.bidId === bid.id)
  if (byBidId) return byBidId
  const wanted = bid.description.trim().toLowerCase()
  const byDescription = lines.filter((line) => line.description.trim().toLowerCase() === wanted)
  return byDescription.length === 1 ? byDescription[0] : undefined
}

function toCell(
  callout: PlanCalloutRow,
  bid: BidRow | undefined,
  documentName: string,
): SheetMatrixCell {
  const statedQty = toNumber(callout.quantity) ?? 0
  const officialQty = bid ? toNumber(bid.officialQuantity) : null

  let status: CellStatus
  let diffQty: number | null = null
  let diffPct: number | null = null
  if (!bid || officialQty == null) {
    status = "unlinked"
  } else if (isLumpSum(bid.unit)) {
    // A lump-sum item has no quantity to disagree with — the sheet stating
    // "1 LS" or a count of something inside it is information, not a diff.
    status = "lump_sum"
  } else {
    diffQty = statedQty - officialQty
    diffPct = officialQty === 0 ? null : (diffQty / officialQty) * 100
    status = sameQuantity(statedQty, officialQty) ? "match" : "discrepancy"
  }

  return {
    calloutId: callout.id,
    documentId: callout.documentId,
    documentName,
    sheetNumber: callout.sheetNumber,
    sheetTitle: callout.sheetTitle,
    pageNumber: callout.pageNumber,
    bidId: bid?.id ?? null,
    itemNumber: bid?.itemNumber ?? null,
    description: bid?.description ?? callout.description,
    calloutDescription: callout.description,
    unit: bid?.unit ?? callout.unit,
    calloutUnit: callout.unit,
    officialQty,
    statedQty,
    diffQty,
    diffPct,
    status,
    sourceText: callout.sourceText,
    sourceKind: callout.sourceKind,
    confidence: toNumber(callout.confidence),
    notes: callout.notes,
    matchSource: callout.matchSource,
    dismissed: callout.dismissed,
  }
}

/**
 * The AI takeoff's reading of each bid item: every takeoff item the
 * matcher links to the bid, summed. Summed rather than picked because a
 * takeoff can legitimately split one bid item across trades ("18\" RCP —
 * storm drain" and "18\" RCP — culvert"). The same matcher the callouts
 * use, minus the item-number hint the takeoff never had.
 */
function takeoffByBid(
  bidRows: BidRow[],
  takeoffItems: ExtractedTakeoffItem[],
): Map<string, { quantity: number; sheets: Set<string>; confidences: number[] }> {
  const byBid = new Map<string, { quantity: number; sheets: Set<string>; confidences: number[] }>()
  for (const item of takeoffItems) {
    // Zero-quantity items are the extractor explaining why it found
    // nothing (see worker/src/extract.ts), not a reading of the item.
    if (!(item.quantity > 0)) continue
    const match = matchBidItem({ description: item.description, unit: item.unit }, bidRows)
    if (!match) continue
    const entry = byBid.get(match.bid.id) ?? { quantity: 0, sheets: new Set(), confidences: [] }
    entry.quantity += item.quantity
    if (item.sourceSheets) entry.sheets.add(item.sourceSheets)
    if (item.confidence != null) entry.confidences.push(item.confidence)
    byBid.set(match.bid.id, entry)
  }
  return byBid
}

export function buildSheetMatrix(input: {
  bidRows: BidRow[]
  calloutRows: PlanCalloutRow[]
  takeoffItems: ExtractedTakeoffItem[]
  estimateLineRows: EstimateLineRow[]
  documents: DocumentLike[]
}): SheetMatrix {
  const { bidRows, calloutRows, takeoffItems, estimateLineRows, documents } = input
  const bidById = new Map(bidRows.map((bid) => [bid.id, bid]))
  const documentNameById = new Map(documents.map((doc) => [doc.id, doc.fileName]))

  const cells = calloutRows.map((callout) =>
    toCell(
      callout,
      callout.bidId ? bidById.get(callout.bidId) : undefined,
      documentNameById.get(callout.documentId) ?? "Unknown document",
    ),
  )

  const dismissed = cells.filter((cell) => cell.dismissed)
  const live = cells.filter((cell) => !cell.dismissed)
  const unlinked = live.filter((cell) => cell.status === "unlinked")

  // --- by sheet ---
  // Keyed by document + sheet number: two plan sets in one project (a base
  // set and a revised set) can both have a C-301, and they're different
  // sheets.
  const sheetGroups = new Map<string, SheetGroup>()
  for (const cell of live) {
    const key = `${cell.documentId}:${cell.sheetNumber}`
    const group = sheetGroups.get(key) ?? {
      key,
      sheetNumber: cell.sheetNumber,
      sheetTitle: cell.sheetTitle,
      documentName: cell.documentName,
      cells: [],
      discrepancyCount: 0,
    }
    if (!group.sheetTitle && cell.sheetTitle) group.sheetTitle = cell.sheetTitle
    group.cells.push(cell)
    if (cell.status === "discrepancy") group.discrepancyCount += 1
    sheetGroups.set(key, group)
  }
  const bySheet = [...sheetGroups.values()].sort(
    (a, b) =>
      compareSheetNumbers(a.sheetNumber, b.sheetNumber) ||
      a.documentName.localeCompare(b.documentName),
  )
  for (const group of bySheet) {
    group.cells.sort((a, b) => {
      // Bid-form order first, then the sheet's own unlinked rows.
      if (a.itemNumber && b.itemNumber) return compareSheetNumbers(a.itemNumber, b.itemNumber)
      if (a.itemNumber) return -1
      if (b.itemNumber) return 1
      return a.calloutDescription.localeCompare(b.calloutDescription)
    })
  }

  // --- by item ---
  const takeoff = takeoffByBid(bidRows, takeoffItems)
  const byItem: ItemSummary[] = [...bidRows]
    .sort((a, b) => compareSheetNumbers(a.itemNumber, b.itemNumber))
    .map((bid) => {
      const itemCells = live
        .filter((cell) => cell.bidId === bid.id)
        .sort(
          (a, b) =>
            compareSheetNumbers(a.sheetNumber, b.sheetNumber) ||
            a.documentName.localeCompare(b.documentName),
        )
      const line = estimateLineForBid(bid, estimateLineRows)
      const takeoffEntry = takeoff.get(bid.id)

      let status: ItemStatus
      if (isLumpSum(bid.unit)) status = "lump_sum"
      else if (itemCells.length === 0) status = "no_callouts"
      else if (itemCells.some((cell) => cell.status === "discrepancy")) status = "discrepancy"
      else status = "match"

      return {
        bidId: bid.id,
        itemNumber: bid.itemNumber,
        description: bid.description,
        unit: bid.unit,
        officialQty: toNumber(bid.officialQuantity) ?? 0,
        aiTakeoffQty: takeoffEntry ? takeoffEntry.quantity : null,
        aiTakeoffSheets: takeoffEntry && takeoffEntry.sheets.size > 0 ? [...takeoffEntry.sheets].join("; ") : null,
        aiTakeoffConfidence:
          takeoffEntry && takeoffEntry.confidences.length > 0
            ? Math.round(Math.min(...takeoffEntry.confidences))
            : null,
        estimateLineId: line?.id ?? null,
        estimateQty: line ? toNumber(line.quantity) : null,
        cells: itemCells,
        status,
      }
    })

  return {
    bySheet,
    byItem,
    unlinked,
    dismissed,
    stats: {
      sheetCount: bySheet.length,
      cellCount: live.length,
      discrepancyCount: live.filter((cell) => cell.status === "discrepancy").length,
      unlinkedCount: unlinked.length,
      itemsWithoutCalloutsCount: byItem.filter((item) => item.status === "no_callouts").length,
    },
  }
}
