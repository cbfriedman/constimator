"use server"

import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { invites, userRoleEnum, users } from "@/db/schema"
import { getAppOrigin } from "@/lib/app-url"
import { getScopedDb } from "@/lib/db/scoped"
import { getSystemDb } from "@/lib/db/system"
import { logger } from "@/lib/logger"
import { syncSubscriptionSeats } from "@/lib/seat-sync"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { parseInput, uuidSchema } from "@/lib/validation"

const roleSchema = z.enum(userRoleEnum.enumValues)
export type Role = z.infer<typeof roleSchema>

function requireAdmin(scopedDb: Awaited<ReturnType<typeof getScopedDb>>) {
  if (scopedDb.role !== "admin") {
    throw new Error("Only an org admin can manage the team.")
  }
}

export async function getTeamData() {
  const scopedDb = await getScopedDb()

  // An invited teammate joins the org inside migration 0008's
  // handle_new_user() signup trigger, so the app runs no code at the moment
  // headcount actually changes. Reconciling here means the seat count is
  // corrected the next time an admin looks at the team — which is also the
  // screen where they'd notice if it were wrong. No-ops without an active
  // subscription, and never throws. See lib/seat-sync.ts.
  await syncSubscriptionSeats(scopedDb)

  const [members, pendingInvites] = await Promise.all([
    scopedDb.users.findMany(),
    scopedDb.invites.findMany(eq(invites.status, "pending")),
  ])
  return { members, pendingInvites, currentUserId: scopedDb.userId, isAdmin: scopedDb.role === "admin" }
}

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: roleSchema,
})

/**
 * Invites a new teammate by email with a role (step 32). Sending is
 * Supabase Auth's own admin.inviteUserByEmail — it creates the auth.users
 * row and emails the link itself; there's no separate email
 * provider/service to configure. The invite/role/org gets carried through
 * to that new auth.users row's metadata so migration 0008's signup
 * trigger can join the right org instead of provisioning a new solo one.
 *
 * Scoped to genuinely new people only: this app models one org per user
 * (users.orgId is a single required FK, not a join table), so someone
 * who already has an account anywhere can't be invited into a second org
 * yet — a clear error beats silently doing something wrong.
 */
export async function inviteTeammateAction(rawInput: { email: string; role: string }) {
  const input = parseInput(inviteSchema, rawInput)
  const scopedDb = await getScopedDb()
  requireAdmin(scopedDb)

  const systemDb = getSystemDb()
  const [existingAccount] = await systemDb
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1)
  if (existingAccount) {
    throw new Error(
      "This person already has a Constimator account — inviting an existing user into a second org isn't supported yet.",
    )
  }

  const org = await scopedDb.org.get()
  if (!org) {
    throw new Error("Org not found.")
  }

  const existingInvite = await scopedDb.invites.findFirst(
    and(eq(invites.email, input.email), eq(invites.status, "pending")),
  )

  const isResend = Boolean(existingInvite)
  const [inviteRow] = existingInvite
    ? await scopedDb.invites.update(eq(invites.id, existingInvite.id), {
        role: input.role,
        updatedAt: new Date(),
      })
    : await scopedDb.invites.insert({
        email: input.email,
        role: input.role,
        invitedBy: scopedDb.userId,
      })

  const origin = await getAppOrigin()
  const supabaseAdmin = getSupabaseAdmin()
  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(input.email, {
    redirectTo: `${origin}/accept-invite`,
    data: { orgId: scopedDb.orgId, role: input.role, inviteId: inviteRow.id },
  })

  if (error) {
    // A resend's row already represented a real, previously-sent invite —
    // leave it as-is and just surface the error. A brand-new row that
    // never actually got emailed shouldn't stick around as a phantom
    // "pending" invite the admin can't explain.
    if (!isResend) {
      await scopedDb.invites.delete(eq(invites.id, inviteRow.id))
    }
    logger.error("Failed to send teammate invite", { email: input.email }, error)
    throw new Error(error.message || "Could not send the invite.")
  }

  return inviteRow
}

export async function revokeInviteAction(rawId: string) {
  const id = parseInput(uuidSchema, rawId)
  const scopedDb = await getScopedDb()
  requireAdmin(scopedDb)

  await scopedDb.invites.update(eq(invites.id, id), { status: "revoked" })
}
