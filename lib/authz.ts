import "server-only"

import type { userRoleEnum } from "@/db/schema"

export type Role = (typeof userRoleEnum.enumValues)[number]

/**
 * Role-based authorization for Server Actions.
 *
 * Until this existed, `user.role` was stored, displayed on /team, and chosen
 * when inviting a teammate — but enforced in exactly two places
 * (app/team/actions.ts and app/settings/actions.ts, each with its own private
 * copy of requireAdmin). Every other mutation in the app checked *membership*
 * via getScopedDb() and never *role*, so a user whose role was literally
 * "viewer" could delete documents and their storage objects, delete bid
 * lines, delete estimate lines, or overwrite an entire estimate with a
 * spreadsheet import. The realistic version of that is a general contractor
 * inviting an outside reviewer to look at a bid, and the reviewer wiping the
 * bid the night before it's due.
 *
 * Two capabilities, because that's what the actions actually divide into:
 *
 *   write — create/edit/delete the bid work itself: projects, documents,
 *           estimates, bid lines, sub quotes, plan holders, cost rates.
 *           admin, estimator and pm. "Project Manager" is a working role on
 *           a bid, so read-only would be the surprising choice; "Viewer" is
 *           unambiguous and gets nothing here.
 *
 *   admin — changes to the org itself: team and invites, org settings, the
 *           AI spend cap, billing, org deletion. admin only.
 *
 * Deliberately NOT gated: the `get*`/`list*` data loaders, even the few that
 * write derived rows as a side effect of being read (getReconciliationData
 * refreshes reconciliation_item, getPlanHolderReview advances a review
 * status). Gating those would stop a viewer from viewing, which is the one
 * thing a viewer is for. They are reachable by any org member by design.
 *
 * This is a policy choice, not a fact about the domain. If pm should be
 * read-only, or estimators shouldn't be able to delete, WRITE_ROLES below is
 * the single place to say so.
 */
const WRITE_ROLES: readonly Role[] = ["admin", "estimator", "pm"]

export function canWrite(role: Role): boolean {
  return WRITE_ROLES.includes(role)
}

export function isAdmin(role: Role): boolean {
  return role === "admin"
}

/**
 * Throws unless the caller may modify bid work. Call immediately after
 * getScopedDb(), before any validation that might have side effects.
 */
export function requireWrite(actor: { role: Role }): void {
  if (!canWrite(actor.role)) {
    throw new Error("Your role is read-only — ask an admin for estimator access to make changes.")
  }
}

/**
 * Throws unless the caller may change the org itself. Replaces the two
 * private copies that used to live in app/team/actions.ts and
 * app/settings/actions.ts, so there is one definition to change.
 */
export function requireAdmin(actor: { role: Role }): void {
  if (!isAdmin(actor.role)) {
    throw new Error("Only an org admin can do this.")
  }
}
