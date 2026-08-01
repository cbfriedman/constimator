"use server"

import { eq } from "drizzle-orm"
import { z } from "zod"

import { costItems } from "@/db/schema"
import {
  equipmentRates as defaultEquipmentRates,
  laborRates as defaultLaborRates,
  marginFields as defaultMarginFields,
} from "@/lib/cost-setup-data"
import { getScopedDb } from "@/lib/db/scoped"
import { parseInput, uuidSchema } from "@/lib/validation"

// Project-level overrides, rate history, and crew/production rates have no
// backing table (deliberately out of scope — see docs/DECISIONS.md and the
// step 8 discussion) and stay client-only. Only labor/equipment/margin rates
// — the three things cost_item actually models — are real here.
async function seedDefaultsIfEmpty(scopedDb: Awaited<ReturnType<typeof getScopedDb>>) {
  const existing = await scopedDb.costItems.findMany()
  if (existing.length > 0) return existing

  await Promise.all([
    ...defaultLaborRates.map((rate) =>
      scopedDb.costItems.insert({
        category: "labor",
        label: rate.classification,
        baseRate: String(rate.base),
        fringeRate: String(rate.fringe),
      }),
    ),
    ...defaultEquipmentRates.map((rate) =>
      scopedDb.costItems.insert({
        category: "equipment",
        label: rate.equipment,
        rate: String(rate.rate),
        rateUnit: rate.unit,
        ownership: rate.ownership === "Owned" ? "owned" : "rental",
      }),
    ),
    ...defaultMarginFields.map((field) =>
      scopedDb.costItems.insert({
        category: "margin",
        label: field.label,
        percentValue: String(field.value),
        helperText: field.helper ?? null,
        requiredWhenIncomplete: field.requiredWhenIncomplete ?? false,
      }),
    ),
  ])

  return scopedDb.costItems.findMany()
}

export async function getCostItemsData() {
  const scopedDb = await getScopedDb()
  return seedDefaultsIfEmpty(scopedDb)
}

const updateCostItemSchema = z.discriminatedUnion("category", [
  z.object({
    id: uuidSchema,
    category: z.literal("labor"),
    base: z.number().finite().nonnegative(),
    fringe: z.number().finite().nonnegative(),
  }),
  z.object({
    id: uuidSchema,
    category: z.literal("equipment"),
    rate: z.number().finite().nonnegative(),
  }),
  z.object({
    id: uuidSchema,
    category: z.literal("margin"),
    value: z.number().finite(),
  }),
])

export type UpdateCostItemInput = z.infer<typeof updateCostItemSchema>

export async function updateCostItemAction(rawInput: UpdateCostItemInput) {
  const input = parseInput(updateCostItemSchema, rawInput)
  const scopedDb = await getScopedDb()

  if (input.category === "labor") {
    await scopedDb.costItems.update(eq(costItems.id, input.id), {
      baseRate: String(input.base),
      fringeRate: String(input.fringe),
    })
  } else if (input.category === "equipment") {
    await scopedDb.costItems.update(eq(costItems.id, input.id), {
      rate: String(input.rate),
    })
  } else {
    await scopedDb.costItems.update(eq(costItems.id, input.id), {
      percentValue: String(input.value),
    })
  }
}
