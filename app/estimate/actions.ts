"use server"

import { and, eq } from "drizzle-orm"

import { estimateLines, estimates } from "@/db/schema"
import { generateEstimateLines } from "@/lib/cost-engine/generate-estimate"
import { getScopedDb } from "@/lib/db/scoped"
import { getCurrentProject, getOrCreateCurrentEstimate } from "@/lib/current-project"
import { estimateRows as defaultEstimateRows } from "@/lib/estimate-data"
import { UI_TO_DB_SOURCE } from "@/lib/estimate-view"
import { todayIsoDate } from "@/lib/format-date"
import type { ExtractedTakeoffItem } from "@/lib/cost-engine/types"

function stripCurrency(value: string): string {
  return value.replace(/[$,]/g, "")
}

async function seedDefaultsIfEmpty(
  scopedDb: Awaited<ReturnType<typeof getScopedDb>>,
  estimateId: string,
) {
  const existing = await scopedDb.estimateLines.findMany(
    eq(estimateLines.estimateId, estimateId),
  )
  if (existing.length > 0) return existing

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

export async function getEstimateData() {
  const scopedDb = await getScopedDb()
  const project = await getCurrentProject(scopedDb)
  if (!project) return { rows: [], project: null }

  const estimate = await getOrCreateCurrentEstimate(scopedDb, project.id)
  const rows = await seedDefaultsIfEmpty(scopedDb, estimate.id)
  return { rows, project }
}

export async function overrideEstimateLineAction(id: string) {
  const scopedDb = await getScopedDb()
  await scopedDb.estimateLines.update(eq(estimateLines.id, id), {
    source: "overridden",
  })
}

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
  projectId: string,
  extractedItems: ExtractedTakeoffItem[],
) {
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
