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

/**
 * One condition read off a subcontractor's quote (step 41), produced by
 * worker/src/extract-quote-conditions.ts and mirrored there — same hand-sync
 * rule as the two types above.
 *
 * `category` is the closed set in db/schema.ts's quoteConditionCategoryEnum;
 * it's typed as a plain string here for the same reason the other two
 * extracted types are loose about their enums — this is what came back
 * across the wire from Claude, not something the DB has vouched for yet.
 * The materialization step is what validates it against the enum.
 *
 * `rawText` is required and verbatim. An extracted condition without the
 * sentence it came from can't be reviewed in the UI, so it can't be trusted,
 * so there'd be no point storing it.
 */
export type ExtractedQuoteCondition = {
  category: string
  rawText: string
  normalizedValue?: string
  sourcePage?: number
  boundingBox?: [number, number, number, number]
  confidence?: number
  flagReason?: string
}

/**
 * One row read off an agency's plan holders list. Mirrors
 * worker/src/types.ts's ExtractedPlanHolder — same hand-sync rule as the
 * types above.
 *
 * `rawText` is required and verbatim, for the same reason it is on
 * ExtractedQuoteCondition: the review screen shows the source roster line
 * beside the parsed fields, and a row nobody can check cheaply is a row
 * nobody checks. Plan holder rosters run company, contact, address, phone
 * and licence together in one cell more often than not, so the parse is the
 * part most likely to be wrong.
 *
 * `companyName` is the only required parsed field — every other field is
 * genuinely absent on real lists often enough that requiring one would push
 * the extractor into inventing it.
 */
export type ExtractedPlanHolder = {
  rawText: string
  companyName: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  licenseNumber?: string
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
