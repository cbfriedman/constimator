/**
 * Shape of one extracted quantity, matching what step 16's takeoff module
 * (lib/takeoff/extract.ts — still blocked on accuracy validation, see that
 * step) is expected to produce, and mirroring scripts/takeoff-validation's
 * ExtractedItem shape since that's the closest real precedent for it. This
 * lets the engine be built and tested now against any {trade, description,
 * quantity, unit} source — real extraction, a fixture, or manual entry —
 * without needing step 16 to exist first.
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
