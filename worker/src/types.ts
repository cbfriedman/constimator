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

// One condition read off a subcontractor's quote (step 41). Mirrors
// lib/cost-engine/types.ts's ExtractedQuoteCondition in the main app — same
// hand-sync rule as the two types above.
//
// rawText is the verbatim sentence the condition came from, and it is
// required: the review UI highlights it in the original document so a human
// can confirm the condition at a glance, and a condition nobody can confirm
// cheaply is one nobody confirms at all.
export type ExtractedQuoteCondition = {
  category: string
  rawText: string
  normalizedValue?: string
  sourcePage?: number
  boundingBox?: [number, number, number, number]
  confidence?: number
  flagReason?: string
}

// One row read off an agency's plan holders list. Mirrors
// lib/cost-engine/types.ts's ExtractedPlanHolder in the main app — same
// hand-sync rule as the types above.
//
// rawText is required for the same reason it is on ExtractedQuoteCondition:
// the review screen shows the verbatim roster line beside the parsed fields.
// Plan holder rosters run company, contact, address, phone and licence
// together in one cell more often than not, so the parse is the part most
// likely to be wrong and the source line is what makes checking it cheap.
//
// companyName is the only required parsed field. A roster row that doesn't
// name a company isn't a plan holder, and every other field is genuinely
// absent on real lists often enough that requiring any of them would push
// the extractor into inventing them.
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

// Shape written into takeoff_job.result on success. `kind` says which
// extractor ran, and only one of items/bidItems/conditions is ever populated
// — app/processing/actions.ts keys off that to decide whether a result should
// feed the estimate (plan takeoff) or not (bid form, which is the *other*
// side of the reconciliation and must never become the contractor's own
// estimate lines; sub quotes, which are a third party's pricing and belong to
// the leveling grid, not to this contractor's estimate either; and plan
// holders, which are who else is bidding and say nothing about the work).
export type TakeoffResult = {
  kind?: "plan_takeoff" | "bid_form" | "sub_quote" | "plan_holders"
  items?: ExtractedTakeoffItem[]
  bidItems?: ExtractedBidItem[]
  conditions?: ExtractedQuoteCondition[]
  planHolders?: ExtractedPlanHolder[]
  /** Printed on the roster when it prints one, ISO yyyy-mm-dd. */
  planHoldersIssuedOn?: string
  quoteTotalAmount?: number
  documentNotes?: string
}
