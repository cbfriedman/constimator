"use server"

import { eq } from "drizzle-orm"
import { z } from "zod"

import { costItems } from "@/db/schema"
import {
  equipmentRates as defaultEquipmentRates,
  laborRates as defaultLaborRates,
  marginFields as defaultMarginFields,
} from "@/lib/cost-setup-data"
import { requireWrite } from "@/lib/authz"
import { getScopedDb } from "@/lib/db/scoped"
import { parseInput, uuidSchema } from "@/lib/validation"

// Project-level overrides, rate history, and crew/production rates have no
// backing table (deliberately out of scope — see docs/DECISIONS.md and the
// step 8 discussion) and stay client-only. Only labor/equipment/margin rates
// — the three things cost_item actually models — are real here.
//
// This used to seed lib/cost-setup-data.ts's DEMO VALUES as real cost_item
// rows: Operator Group 3 at $55.10/$34.75, a CAT 330 at $145/hr, 8%
// overhead, 5% profit, 10% general markup, 1.2% bond. Those are one
// contractor's actual numbers, they were written unlabelled into every new
// org, and they are not inert — getOrgMarkupPct() reads the general-markup
// row straight out of this table and stamps it on every estimate line, and
// findCandidateRates() suggests the labor/equipment rows by name. So a
// contractor who skimmed past Cost Setup (which docs/PILOT_CHECKLIST.md
// actively invites) exported a bid priced on someone else's markups without
// ever being told. docs/DECISIONS.md files pre-seeded defaults as a Phase 2+
// idea, and even then as *industry averages* — not as one company's rates.
//
// Values are no longer seeded. What is still created is the row SCAFFOLD —
// label, unit, ownership, and which margin fields are required — with every
// rate left NULL, i.e. explicitly unset. That is not a compromise for its
// own sake: updateCostItemAction can only update an existing row by id, and
// there is no create-cost-item action or UI anywhere, so an org with zero
// rows would have an empty Cost Setup screen it could never fill in. The
// scaffold is what makes the page editable; the numbers are the org's own.
//
// Unset reads back as 0 through lib/cost-setup-view.ts (Number(null) === 0),
// which renders as $0.00 / 0% — visibly not a rate. Anything downstream that
// could otherwise paper over a missing value must say so rather than guess:
// see getOrgMarkupPct in lib/cost-engine/generate-estimate.ts, which no
// longer falls back to a flat 10%.
async function ensureCostItemScaffold(scopedDb: Awaited<ReturnType<typeof getScopedDb>>) {
  const existing = await scopedDb.costItems.findMany()
  if (existing.length > 0) return existing

  await Promise.all([
    ...defaultLaborRates.map((rate) =>
      scopedDb.costItems.insert({
        category: "labor",
        label: rate.classification,
        baseRate: null,
        fringeRate: null,
      }),
    ),
    ...defaultEquipmentRates.map((rate) =>
      scopedDb.costItems.insert({
        category: "equipment",
        label: rate.equipment,
        rate: null,
        // Unit and ownership are structural, not priced: they describe what
        // the row is, and the org edits the number beside them.
        rateUnit: rate.unit,
        ownership: rate.ownership === "Owned" ? "owned" : "rental",
      }),
    ),
    ...defaultMarginFields.map((field) =>
      scopedDb.costItems.insert({
        category: "margin",
        label: field.label,
        percentValue: null,
        helperText: field.helper ?? null,
        requiredWhenIncomplete: field.requiredWhenIncomplete ?? false,
      }),
    ),
  ])

  return scopedDb.costItems.findMany()
}

export async function getCostItemsData() {
  const scopedDb = await getScopedDb()
  return ensureCostItemScaffold(scopedDb)
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
  requireWrite(scopedDb)

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
