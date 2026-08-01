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

// Shape written into takeoff_job.result on success.
export type TakeoffResult = {
  items: ExtractedTakeoffItem[]
}
