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
 * (step 16's eventual output — see lib/cost-engine/types.ts for why this
 * takes a plain array instead of importing that module directly, which
 * doesn't exist yet) plus the org's cost_item defaults, and writes draft
 * estimate_line rows.
 *
 * Not yet called from anywhere real — step 16 (the actual extraction) and
 * the worker-to-app handoff for a completed takeoff_job (step 17) are both
 * still needed before there's a real caller. This is the piece those wire
 * into once they exist, most likely via a new API route the worker can hit
 * (it can't call a Next.js Server Action directly, being a separate
 * process). Safe to call by hand now (e.g. from a script or a future admin
 * action) to verify the engine itself.
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
