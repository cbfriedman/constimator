"use server"

import { eq } from "drizzle-orm"
import { z } from "zod"

import { users } from "@/db/schema"
import { getScopedDb } from "@/lib/db/scoped"
import { DOCUMENTS_BUCKET } from "@/lib/document-upload"
import { logger } from "@/lib/logger"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
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

/**
 * Deletes the org and everything belonging to it, permanently.
 *
 * docs/DATA-RETENTION.md listed "self-service deletion in-app" as an open
 * item and described deletion as a manual process: email support, and
 * someone removes your data by hand within 30 days. That's workable for a
 * pilot and untenable for a paid multi-tenant product holding other
 * companies' bid pricing — a customer has to be able to leave without
 * asking permission.
 *
 * Order matters and is deliberate:
 *   1. Storage objects, which live outside Postgres and would otherwise be
 *      orphaned with no row left pointing at them.
 *   2. Auth users — `public.user.id` cascades from `auth.users`, so this
 *      also removes the membership rows.
 *   3. The org row, which cascades every remaining project, document,
 *      estimate, bid, and reconciliation row (see db/schema.ts's
 *      onDelete: "cascade" foreign keys).
 *
 * Each step is safe to repeat, so a failure partway through can be
 * retried by simply calling this again.
 */
export async function deleteOrgAction(rawConfirmation: string) {
  const scopedDb = await getScopedDb()
  requireAdmin(scopedDb)

  const org = await scopedDb.org.get()
  if (!org) {
    throw new Error("Organization not found.")
  }

  // Typing the company name is the guard against a misclick destroying a
  // contractor's bid history. Compared case-insensitively and trimmed —
  // the intent is to prove deliberate action, not to test typing.
  const confirmation = parseInput(z.string().trim().max(200), rawConfirmation)
  if (confirmation.toLowerCase() !== org.name.trim().toLowerCase()) {
    throw new Error(
      `Type the company name exactly ("${org.name}") to confirm deletion.`,
    )
  }

  const members = await scopedDb.users.findMany()
  const admin = getSupabaseAdmin()

  // Storage paths are always "{orgId}/..." (lib/document-upload.ts, and
  // db/storage-setup.sql's RLS policy keys on that first segment), so the
  // org's own prefix is the complete set of its objects.
  const documentRows = await scopedDb.documents.findMany()
  const storagePaths = documentRows.map((row) => row.storagePath)
  if (storagePaths.length > 0) {
    const { error } = await admin.storage.from(DOCUMENTS_BUCKET).remove(storagePaths)
    if (error) {
      logger.error("Failed to delete org documents from storage", { orgId: scopedDb.orgId }, error)
      throw new Error("Could not delete your uploaded documents. Nothing was deleted — try again.")
    }
  }

  for (const member of members) {
    const { error } = await admin.auth.admin.deleteUser(member.id)
    if (error) {
      logger.error(
        "Failed to delete auth user during org deletion",
        { orgId: scopedDb.orgId, userId: member.id },
        error,
      )
      throw new Error(
        "Could not fully delete the account. Some data may already be removed — contact support@constimator.com so this can be finished properly.",
      )
    }
  }

  await scopedDb.org.delete()

  logger.info("Org deleted by admin request", {
    orgId: scopedDb.orgId,
    memberCount: members.length,
    documentCount: storagePaths.length,
  })
}
