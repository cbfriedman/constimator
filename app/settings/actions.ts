"use server"

import { eq } from "drizzle-orm"
import { z } from "zod"

import { users } from "@/db/schema"
import { getScopedDb } from "@/lib/db/scoped"
import { parseInput } from "@/lib/validation"

function requireAdmin(scopedDb: Awaited<ReturnType<typeof getScopedDb>>) {
  if (scopedDb.role !== "admin") {
    throw new Error("Only an org admin can change company settings.")
  }
}

export async function getSettingsData() {
  const scopedDb = await getScopedDb()
  const org = await scopedDb.org.get()
  const [user] = await scopedDb.users.findMany(eq(users.id, scopedDb.userId))

  return {
    org: {
      name: org?.name ?? "",
      aiMonthlySpendCapUsd: org?.aiMonthlySpendCapUsd ?? "20.00",
    },
    user: {
      fullName: user?.fullName ?? "",
      email: user?.email ?? "",
      role: user?.role ?? "estimator",
    },
    isAdmin: scopedDb.role === "admin",
  }
}

const orgNameSchema = z.string().trim().min(1, "Company name is required").max(200)

export async function updateOrgNameAction(rawName: string) {
  const name = parseInput(orgNameSchema, rawName)
  const scopedDb = await getScopedDb()
  requireAdmin(scopedDb)
  await scopedDb.org.update({ name })
}

const spendCapSchema = z.coerce
  .number()
  .positive("Monthly limit must be greater than $0")
  .max(100000, "That's a very high monthly limit — double-check the number")

export async function updateSpendCapAction(rawCapUsd: number) {
  const capUsd = parseInput(spendCapSchema, rawCapUsd)
  const scopedDb = await getScopedDb()
  requireAdmin(scopedDb)
  await scopedDb.org.update({ aiMonthlySpendCapUsd: capUsd.toFixed(2) })
}

const fullNameSchema = z.string().trim().min(1, "Name is required").max(200)

export async function updateProfileAction(rawFullName: string) {
  const fullName = parseInput(fullNameSchema, rawFullName)
  const scopedDb = await getScopedDb()
  await scopedDb.users.update(eq(users.id, scopedDb.userId), { fullName })
}
