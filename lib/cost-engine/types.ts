/**
 * Shape of one extracted quantity, produced by worker/src/extract.ts (step
 * 16) and mirrored there as an independent copy (see that file — the
 * worker is intentionally isolated from this app's lib/). Also matches
 * scripts/takeoff-validation's ExtractedItem, the standalone script this
 * was validated against first.
 */
export type ExtractedTakeoffItem = {
  trade: string
  description: string
  quantity: number
  unit: string
  confidence?: number
  sourceSheets?: string
  notes?: string
}

/**
 * One line item transcribed off an official bid form (step 40), produced by
 * worker/src/extract-bid-form.ts and mirrored there — same hand-sync rule as
 * ExtractedTakeoffItem above. Not a cost-engine input: bid items are the
 * official side of a reconciliation, so they belong in `bid` rows, never in
 * generateEstimateLines.
 */
export type ExtractedBidItem = {
  itemNumber: string
  description: string
  unit: string
  quantity: number
  specSection?: string
  confidence?: number
  sourcePage?: number
  notes?: string
}

export type GeneratedEstimateLine = {
  description: string
  quantity: string
  unit: string
  unitPrice: string
  markupPct: string
  total: string
  source: "ai_extracted"
  note: string | null
}
