// Mirrors lib/cost-engine/types.ts's ExtractedTakeoffItem in the main app.
// Kept as an independent copy rather than a cross-package import — this
// worker is intentionally isolated with its own package.json/node_modules
// (see worker/README.md for why). Keep the two in sync by hand if either
// changes.
export type ExtractedTakeoffItem = {
  trade: string
  description: string
  quantity: number
  unit: string
  confidence?: number
  sourceSheets?: string
  notes?: string
}

// One line item transcribed off an official bid form / schedule of items
// (step 40). Deliberately NOT the same shape as ExtractedTakeoffItem: a
// takeoff item is a measured quantity the AI derived from drawings, a bid
// item is a number already printed on the form. They differ in what the
// fields mean and in where the result goes — see extract-bid-form.ts.
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

// Shape written into takeoff_job.result on success. `kind` says which
// extractor ran, and only one of items/bidItems is ever populated —
// app/processing/actions.ts keys off that to decide whether a result should
// feed the estimate (plan takeoff) or not (bid form, which is the *other*
// side of the reconciliation and must never become the contractor's own
// estimate lines).
export type TakeoffResult = {
  kind?: "plan_takeoff" | "bid_form"
  items?: ExtractedTakeoffItem[]
  bidItems?: ExtractedBidItem[]
}
