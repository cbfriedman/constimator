export type KnownQuantityItem = {
  trade: string
  description: string
  quantity: number
  unit: string
  notes?: string
}

export type KnownQuantities = {
  projectName: string
  /** Optional — restrict rasterization/extraction to these 1-indexed pages. */
  pages?: number[]
  items: KnownQuantityItem[]
}

export type ExtractedItem = {
  trade: string
  description: string
  quantity: number
  unit: string
  /** Claude's own confidence, 0-100 — separate from whether it's actually correct. */
  confidence: number
  sourceSheets?: string
  notes?: string
}

export type PlanSetResult = {
  planSetName: string
  known: KnownQuantities
  extracted: ExtractedItem[]
  pageCount: number
}
