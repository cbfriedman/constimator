import { z } from "zod"

import type { ExtractedBidItem } from "@/lib/cost-engine/types"

export const extractedBidItemSchema = z.object({
  itemNumber: z.string().trim().min(1),
  description: z.string().trim().min(1),
  unit: z.string().trim().min(1),
  quantity: z.number().finite(),
  specSection: z.string().trim().min(1).optional(),
  confidence: z.number().min(0).max(100).optional(),
  sourcePage: z.number().int().positive().optional(),
  notes: z.string().optional(),
})

export type PendingBidFormItem = z.infer<typeof extractedBidItemSchema>

export type PendingBidFormExtraction = {
  jobId: string
  documentId: string
  fileName: string
  items: PendingBidFormItem[]
}

type BidFormJobLike = {
  id: string
  documentId: string
  status: string
  createdAt: Date
  result: {
    kind?: string
    bidItems?: ExtractedBidItem[]
  } | null
}

type DocumentLike = {
  id: string
  fileName: string
}

type BidLike = {
  documentId: string | null
}

function latestJobForDocument<T extends { documentId: string; createdAt: Date }>(
  jobs: T[],
  documentId: string,
): T | undefined {
  return jobs
    .filter((job) => job.documentId === documentId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
}

/**
 * Bid-form extractions that have finished but have not yet been confirmed
 * into `bid` rows. A document is considered imported once any bid line
 * points at it — the contractor can still re-import explicitly.
 */
export function pendingBidFormExtractions(
  jobs: BidFormJobLike[],
  documents: DocumentLike[],
  existingBids: BidLike[],
): PendingBidFormExtraction[] {
  const importedDocumentIds = new Set(
    existingBids
      .map((bid) => bid.documentId)
      .filter((id): id is string => typeof id === "string"),
  )

  const pending: PendingBidFormExtraction[] = []

  for (const document of documents) {
    if (importedDocumentIds.has(document.id)) continue
    const job = latestJobForDocument(jobs, document.id)
    if (!job || job.status !== "complete") continue
    if (job.result?.kind !== "bid_form") continue

    const parsed = z.array(extractedBidItemSchema).safeParse(job.result.bidItems ?? [])
    if (!parsed.success || parsed.data.length === 0) continue

    pending.push({
      jobId: job.id,
      documentId: document.id,
      fileName: document.fileName,
      items: parsed.data,
    })
  }

  return pending
}

export function bidRowsFromExtractedItems(
  items: PendingBidFormItem[],
  documentId: string,
): Array<{
  documentId: string
  itemNumber: string
  description: string
  unit: string
  officialQuantity: string
  specSection: string | null
  extractionConfidence: string | null
}> {
  return items.map((item) => ({
    documentId,
    itemNumber: item.itemNumber,
    description: item.description,
    unit: item.unit,
    officialQuantity: String(item.quantity),
    specSection: item.specSection ?? null,
    extractionConfidence:
      item.confidence == null ? null : String(item.confidence),
  }))
}
