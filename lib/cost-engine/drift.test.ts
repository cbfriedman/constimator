import { describe, expect, it, vi } from "vitest"

import type { costItems, estimates } from "@/db/schema"
import { syncRateDrift } from "./drift"
import type { ScopedDb } from "@/lib/current-project"

type EstimateRow = typeof estimates.$inferSelect
type CostItemRow = typeof costItems.$inferSelect

function makeEstimate(overrides: Partial<EstimateRow> = {}): EstimateRow {
  return {
    id: "estimate-1",
    orgId: "org-1",
    projectId: "project-1",
    rateSnapshotDate: "2026-06-15",
    rateDrift: false,
    driftDismissed: false,
    recalculated: false,
    createdAt: new Date("2026-06-15T00:00:00.000Z"),
    updatedAt: new Date("2026-06-15T00:00:00.000Z"),
    ...overrides,
  }
}

function makeCostItem(overrides: Partial<CostItemRow> = {}): CostItemRow {
  return {
    id: "cost-item-1",
    orgId: "org-1",
    category: "labor",
    label: "Operator",
    baseRate: "45.00",
    fringeRate: "12.00",
    rate: null,
    rateUnit: null,
    ownership: null,
    percentValue: null,
    helperText: null,
    requiredWhenIncomplete: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  }
}

// syncRateDrift only ever calls scopedDb.costItems.findMany() and
// scopedDb.estimates.update() — this mocks exactly that surface rather than
// the full getScopedDb() shape, cast through unknown since the rest of
// ScopedDb's real interface is irrelevant to the function under test.
function makeScopedDb(estimate: EstimateRow, costItemRows: CostItemRow[]) {
  const findMany = vi.fn(async () => costItemRows)
  const update = vi.fn(async (_condition: unknown, values: Partial<EstimateRow>) => [
    { ...estimate, ...values },
  ])
  const scopedDb = {
    costItems: { findMany },
    estimates: { update },
  } as unknown as ScopedDb
  return { scopedDb, findMany, update }
}

describe("syncRateDrift", () => {
  it("returns the estimate unchanged, without querying cost_item, when rateDrift is already true", async () => {
    const estimate = makeEstimate({ rateDrift: true })
    const { scopedDb, findMany } = makeScopedDb(estimate, [makeCostItem()])

    const result = await syncRateDrift(scopedDb, estimate)

    expect(result).toBe(estimate)
    expect(findMany).not.toHaveBeenCalled()
  })

  it("returns the estimate unchanged when the org has no cost_item rows at all", async () => {
    const estimate = makeEstimate()
    const { scopedDb, update } = makeScopedDb(estimate, [])

    const result = await syncRateDrift(scopedDb, estimate)

    expect(result).toBe(estimate)
    expect(update).not.toHaveBeenCalled()
  })

  it("does not flag drift when every rate was last changed before the snapshot date", async () => {
    const estimate = makeEstimate({ rateSnapshotDate: "2026-06-15" })
    const costItemRows = [makeCostItem({ updatedAt: new Date("2026-06-14T23:59:59.999Z") })]
    const { scopedDb, update } = makeScopedDb(estimate, costItemRows)

    const result = await syncRateDrift(scopedDb, estimate)

    expect(result).toBe(estimate)
    expect(update).not.toHaveBeenCalled()
  })

  it("does not flag drift when a rate's updatedAt is exactly the snapshot's midnight instant", async () => {
    // Boundary: latestRateChange <= snapshotInstant, so equal counts as
    // "not after" and shouldn't flag.
    const estimate = makeEstimate({ rateSnapshotDate: "2026-06-15" })
    const costItemRows = [makeCostItem({ updatedAt: new Date("2026-06-15T00:00:00.000Z") })]
    const { scopedDb, update } = makeScopedDb(estimate, costItemRows)

    const result = await syncRateDrift(scopedDb, estimate)

    expect(result).toBe(estimate)
    expect(update).not.toHaveBeenCalled()
  })

  it("flags drift for a rate change later the same calendar day as the snapshot (documented as conservative on purpose)", async () => {
    const estimate = makeEstimate({ rateSnapshotDate: "2026-06-15" })
    const costItemRows = [makeCostItem({ updatedAt: new Date("2026-06-15T15:00:00.000Z") })]
    const { scopedDb, update } = makeScopedDb(estimate, costItemRows)

    const result = await syncRateDrift(scopedDb, estimate)

    expect(result.rateDrift).toBe(true)
    expect(update).toHaveBeenCalledTimes(1)
  })

  it("flags drift, clears driftDismissed, and returns the updated row when a rate changed after the snapshot", async () => {
    const estimate = makeEstimate({ rateSnapshotDate: "2026-06-15", driftDismissed: true })
    const costItemRows = [makeCostItem({ updatedAt: new Date("2026-07-01T00:00:00.000Z") })]
    const { scopedDb, update } = makeScopedDb(estimate, costItemRows)

    const result = await syncRateDrift(scopedDb, estimate)

    expect(result.rateDrift).toBe(true)
    expect(result.driftDismissed).toBe(false)
    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ rateDrift: true, driftDismissed: false }),
    )
  })

  it("uses the latest updatedAt across multiple cost_item rows, not just the first", async () => {
    const estimate = makeEstimate({ rateSnapshotDate: "2026-06-15" })
    const costItemRows = [
      makeCostItem({ id: "1", updatedAt: new Date("2026-06-01T00:00:00.000Z") }), // before
      makeCostItem({ id: "2", updatedAt: new Date("2026-07-01T00:00:00.000Z") }), // after — this one matters
      makeCostItem({ id: "3", updatedAt: new Date("2026-06-10T00:00:00.000Z") }), // before
    ]
    const { scopedDb, update } = makeScopedDb(estimate, costItemRows)

    const result = await syncRateDrift(scopedDb, estimate)

    expect(result.rateDrift).toBe(true)
    expect(update).toHaveBeenCalledTimes(1)
  })
})
