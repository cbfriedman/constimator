"use server"

import { cache } from "react"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { estimateLines, estimates, projects } from "@/db/schema"
import { generateEstimateLines } from "@/lib/cost-engine/generate-estimate"
import { getScopedDb } from "@/lib/db/scoped"
import { getCurrentProject, getBidsForProject, getOrCreateCurrentEstimate } from "@/lib/current-project"
import { estimateRows as defaultEstimateRows } from "@/lib/estimate-data"
import { UI_TO_DB_SOURCE } from "@/lib/estimate-view"
import { todayIsoDate } from "@/lib/format-date"
import { demoProject } from "@/lib/mock-data"
import type { ExtractedTakeoffItem } from "@/lib/cost-engine/types"
import { numericString, optionalNumericString, parseInput, uuidSchema } from "@/lib/validation"

type ProjectRow = typeof projects.$inferSelect

function stripCurrency(value: string): string {
  return value.replace(/[$,]/g, "")
}

// Only ever seeds the one canonical sample project (Shasta County, #24-118
// — the walkthrough referenced throughout the marketing site and
// dashboard). This used to run for *any* project's first empty-estimate
// view, which meant a real customer's brand-new project silently filled
// up with 15 fabricated demo line items stamped with their own org id —
// found during a pre-launch audit. A real project now just starts empty,
// same as every other real record in this app.
async function seedDefaultsIfEmpty(
  scopedDb: Awaited<ReturnType<typeof getScopedDb>>,
  estimateId: string,
  project: ProjectRow,
) {
  const existing = await scopedDb.estimateLines.findMany(
    eq(estimateLines.estimateId, estimateId),
  )
  if (existing.length > 0) return existing
  if (project.number !== demoProject.number) return existing

  await Promise.all(
    defaultEstimateRows.map((row, index) =>
      scopedDb.estimateLines.insert({
        estimateId,
        lineNumber: index + 1,
        description: row.description,
        note: row.note ?? null,
        quantity: stripCurrency(row.qty),
        unit: row.unit,
        unitPrice: stripCurrency(row.unitPrice),
        laborCost: row.labor === "—" ? null : stripCurrency(row.labor),
        materialCost: row.material === "—" ? null : stripCurrency(row.material),
        equipmentCost: row.equip === "—" ? null : stripCurrency(row.equip),
        subCost: row.sub === "—" ? null : stripCurrency(row.sub),
        markupPct: row.mu,
        total: stripCurrency(row.total),
        source: UI_TO_DB_SOURCE[row.source],
      }),
    ),
  )

  return scopedDb.estimateLines.findMany(eq(estimateLines.estimateId, estimateId))
}

// Cached per request — an audit found this called twice on a single
// /reports load (once directly by the page, once again inside
// getReconciliationData()'s recomputeReconciliation()), each run repeating
// getCurrentProject/getOrCreateCurrentEstimate and the estimate_line query.
// Zero args, so this is one memoized result per render — exactly right for
// "the current project's estimate," which is stable for the whole request.
export const getEstimateData = cache(async () => {
  const scopedDb = await getScopedDb()
  const project = await getCurrentProject(scopedDb)
  if (!project) return { rows: [], project: null, bidLineCount: 0 }

  const estimate = await getOrCreateCurrentEstimate(scopedDb, project.id)
  const rows = await seedDefaultsIfEmpty(scopedDb, estimate.id, project)
  const bidRows = await getBidsForProject(scopedDb, project.id)
  return { rows, project, bidLineCount: bidRows.length }
})

export async function overrideEstimateLineAction(rawId: string) {
  const id = parseInput(uuidSchema, rawId)
  const scopedDb = await getScopedDb()
  await scopedDb.estimateLines.update(eq(estimateLines.id, id), {
    source: "overridden",
  })
}

const estimateLineInputSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  note: z.string().nullable(),
  quantity: numericString(),
  unit: z.string().trim().min(1, "Unit is required"),
  unitPrice: numericString(),
  laborCost: optionalNumericString(),
  materialCost: optionalNumericString(),
  equipmentCost: optionalNumericString(),
  subCost: optionalNumericString(),
  markupPct: numericString(),
})

export type EstimateLineInput = z.infer<typeof estimateLineInputSchema>

// total = quantity × unit price. Labor/material/equipment/sub costs are an
// informational per-unit breakdown a contractor can fill in for their own
// reference — they aren't summed into the price (unit price is entered
// independently, same as every seeded demo row: e.g. Roadway Excavation's
// $14.20 unit price vs. $4.10+$0.60+$7.30=$12.00 of breakdown).
function computeTotal(quantity: string, unitPrice: string): string {
  const qty = Number(quantity)
  const price = Number(unitPrice)
  const total = Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0
  return total.toFixed(2)
}

export async function addEstimateLineAction(rawProjectId: string, rawInput: EstimateLineInput) {
  const projectId = parseInput(uuidSchema, rawProjectId)
  const input = parseInput(estimateLineInputSchema, rawInput)
  const scopedDb = await getScopedDb()
  const estimate = await getOrCreateCurrentEstimate(scopedDb, projectId)
  const existingLines = await scopedDb.estimateLines.findMany(
    eq(estimateLines.estimateId, estimate.id),
  )

  const [line] = await scopedDb.estimateLines.insert({
    estimateId: estimate.id,
    lineNumber: existingLines.length + 1,
    ...input,
    total: computeTotal(input.quantity, input.unitPrice),
    source: "manual",
  })
  return line
}

// Full field edit — distinct from overrideEstimateLineAction, which is
// specifically for flagging disagreement with the official bid form's
// quantity (requires a note, flips source to "overridden"). This is for
// correcting/filling in a line's own numbers and leaves source as-is.
export async function updateEstimateLineAction(rawId: string, rawInput: EstimateLineInput) {
  const id = parseInput(uuidSchema, rawId)
  const input = parseInput(estimateLineInputSchema, rawInput)
  const scopedDb = await getScopedDb()
  const [line] = await scopedDb.estimateLines.update(eq(estimateLines.id, id), {
    ...input,
    total: computeTotal(input.quantity, input.unitPrice),
  })
  return line
}

export async function deleteEstimateLineAction(rawId: string) {
  const id = parseInput(uuidSchema, rawId)
  const scopedDb = await getScopedDb()
  await scopedDb.estimateLines.delete(eq(estimateLines.id, id))
}

// Bulk-applies one markup % to every line in the project's current
// estimate — the "Markup: N% (all items)" selector on /estimate. A line's
// own total (quantity × unit price) doesn't change; only markupPct does,
// which is what lib/estimate-view.ts's sumLineMarkup then rolls up into
// the Bid Total.
export async function setEstimateMarkupAction(rawProjectId: string, markupPct: number) {
  const projectId = parseInput(uuidSchema, rawProjectId)
  const scopedDb = await getScopedDb()
  const estimate = await getOrCreateCurrentEstimate(scopedDb, projectId)
  const lines = await scopedDb.estimateLines.findMany(
    eq(estimateLines.estimateId, estimate.id),
  )
  await Promise.all(
    lines.map((line) =>
      scopedDb.estimateLines.update(eq(estimateLines.id, line.id), {
        markupPct: String(markupPct),
      }),
    ),
  )
}

// extractedItems ultimately comes from takeoff_job.result — a jsonb column
// written by the worker (a separate process, over its own DB connection).
// Drizzle's `.$type<>()` on that column is compile-time only; nothing
// validates the JSON actually has this shape at runtime before it gets
// here. This is the real trust boundary, so it's validated with the same
// rigor as user input rather than assumed safe because it "came from our
// own worker."
const extractedTakeoffItemSchema = z.object({
  trade: z.string().trim().min(1),
  description: z.string().trim().min(1),
  quantity: z.number().finite(),
  unit: z.string().trim().min(1),
  confidence: z.number().min(0).max(100).optional(),
  sourceSheets: z.string().optional(),
  notes: z.string().optional(),
})

/**
 * The cost engine's entry point: takes quantities extracted from a plan set
 * (worker/src/extract.ts's output, step 16) plus the org's cost_item
 * defaults, and writes draft estimate_line rows.
 *
 * Called from app/processing/actions.ts's getProcessingStatus, which pulls
 * together every complete takeoff_job's result for a project each time
 * /processing is loaded — the worker can't call a Server Action directly
 * (it's a separate process), so that's the handoff point instead of a
 * push from the worker.
 *
 * Regenerating replaces only this estimate's previously AI-extracted lines
 * (source = "ai_extracted") — anything manually entered, reviewed, or
 * overridden is left alone. Snapshots rate_snapshot_date to today and
 * clears any drift flag, since a fresh generation *is* a fresh snapshot.
 */
export async function generateEstimateFromTakeoff(
  rawProjectId: string,
  rawExtractedItems: ExtractedTakeoffItem[],
) {
  const projectId = parseInput(uuidSchema, rawProjectId)
  const extractedItems = parseInput(
    z.array(extractedTakeoffItemSchema),
    rawExtractedItems,
  )
  const scopedDb = await getScopedDb()
  const estimate = await getOrCreateCurrentEstimate(scopedDb, projectId)

  const [costItemRows, existingLines] = await Promise.all([
    scopedDb.costItems.findMany(),
    scopedDb.estimateLines.findMany(eq(estimateLines.estimateId, estimate.id)),
  ])

  await scopedDb.estimateLines.delete(
    // Both operands are always provided, so and() always returns a real
    // SQL condition here — the `| undefined` in its type is only for the
    // zero/all-undefined-args case, which this isn't.
    and(eq(estimateLines.estimateId, estimate.id), eq(estimateLines.source, "ai_extracted"))!,
  )

  const keptLineCount = existingLines.filter((line) => line.source !== "ai_extracted").length
  const generatedLines = generateEstimateLines(extractedItems, costItemRows)

  const inserted = await Promise.all(
    generatedLines.map((line, index) =>
      scopedDb.estimateLines.insert({
        estimateId: estimate.id,
        lineNumber: keptLineCount + index + 1,
        ...line,
      }),
    ),
  )

  await scopedDb.estimates.update(eq(estimates.id, estimate.id), {
    rateSnapshotDate: todayIsoDate(),
    rateDrift: false,
    driftDismissed: false,
  })

  return inserted.flat()
}

export async function importFromBidScheduleAction(rawProjectId: string) {
  const projectId = parseInput(uuidSchema, rawProjectId)
  const scopedDb = await getScopedDb()
  const estimate = await getOrCreateCurrentEstimate(scopedDb, projectId)
  const [bidRows, existingLines] = await Promise.all([
    getBidsForProject(scopedDb, projectId),
    scopedDb.estimateLines.findMany(eq(estimateLines.estimateId, estimate.id)),
  ])
  if (bidRows.length === 0) {
    throw new Error("Enter or import the official bid form first.")
  }

  const defaultMarkup = existingLines[0]?.markupPct ?? "10"
  let lineNumber = existingLines.length + 1
  let added = 0

  for (const bid of bidRows) {
    if (existingLines.some((line) => line.bidId === bid.id)) continue

    const descriptionMatches = existingLines.filter(
      (line) =>
        line.description.trim().toLowerCase() === bid.description.trim().toLowerCase(),
    )
    if (descriptionMatches.length === 1) {
      const match = descriptionMatches[0]
      if (!match.bidId) {
        await scopedDb.estimateLines.update(eq(estimateLines.id, match.id), {
          bidId: bid.id,
        })
      }
      continue
    }

    await scopedDb.estimateLines.insert({
      estimateId: estimate.id,
      bidId: bid.id,
      lineNumber: lineNumber,
      description: bid.description,
      quantity: bid.officialQuantity,
      unit: bid.unit,
      unitPrice: "0",
      markupPct: defaultMarkup,
      total: "0",
      source: "official",
    })
    lineNumber += 1
    added += 1
  }

  return { added, bidLineCount: bidRows.length }
}
