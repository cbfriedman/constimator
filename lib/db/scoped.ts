import "server-only"

import { cache } from "react"
import { and, eq, type SQL } from "drizzle-orm"
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core"

import {
  aiUsageEvents,
  bids,
  costItems,
  documents,
  estimateLines,
  estimates,
  invites,
  orgs,
  projects,
  quoteConditions,
  quoteLineItems,
  reconciliationItems,
  reviewRequests,
  subQuotes,
  takeoffJobs,
  users,
} from "@/db/schema"
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server"
import { getDb } from "./client"

export class UnauthenticatedError extends Error {
  constructor() {
    super("No signed-in user")
  }
}

export class NoOrgMembershipError extends Error {
  constructor(userId: string) {
    super(`User ${userId} has no org membership`)
  }
}

type CurrentMembership = {
  userId: string
  orgId: string
  role: (typeof users.$inferSelect)["role"]
}

// Cached per request — if getScopedDb() is called from multiple server
// components/actions during one render, this resolves the signed-in user's
// org (and, since step 32, their own row's id/role — needed for
// admin-only checks like app/team/actions.ts's invite feature) once
// instead of re-querying auth + the "user" table each time.
const getCurrentMembership = cache(async (): Promise<CurrentMembership> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    throw new UnauthenticatedError()
  }

  const db = getDb()
  const [membership] = await db
    .select({ orgId: users.orgId, role: users.role })
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1)

  if (!membership) {
    throw new NoOrgMembershipError(authUser.id)
  }

  return { userId: authUser.id, orgId: membership.orgId, role: membership.role }
})

// Wraps one table with its org_id column pre-applied to every read/write.
// insert() stamps orgId onto the row itself, so a caller can't pass a
// different org_id even by accident — the Postgres RLS policy from step 8
// would reject it anyway, but this keeps the mistake from ever reaching SQL.
function orgScoped<T extends PgTable>(
  table: T,
  orgIdColumn: AnyPgColumn,
  orgId: string,
) {
  type Row = T["$inferSelect"]
  type NewRow = T["$inferInsert"]

  const db = getDb()
  // Drizzle's builder types get too strict to satisfy through a generic `T`
  // (it wants a concrete table, not a type parameter) — the casts below are
  // local to this one helper; every caller-facing method above them keeps
  // its real Row/NewRow types, so callers still get full type safety.
  const anyTable = table as unknown as PgTable
  const scope = eq(orgIdColumn, orgId)
  const withScope = (extra?: SQL) => (extra ? and(scope, extra) : scope)

  return {
    findMany: (extra?: SQL): Promise<Row[]> =>
      db.select().from(anyTable).where(withScope(extra)) as Promise<Row[]>,

    findFirst: async (extra?: SQL): Promise<Row | undefined> => {
      const rows = (await db
        .select()
        .from(anyTable)
        .where(withScope(extra))
        .limit(1)) as Row[]
      return rows[0]
    },

    // orgId is deliberately excluded from the input type — it's always the
    // caller's own org, stamped on below, never something a caller chooses.
    insert: (values: Omit<NewRow, "orgId">): Promise<Row[]> =>
      db
        .insert(anyTable)
        .values({ ...values, orgId } as NewRow)
        .returning() as Promise<Row[]>,

    update: (extra: SQL, values: Partial<NewRow>): Promise<Row[]> =>
      db
        .update(anyTable)
        .set(values)
        .where(withScope(extra))
        .returning() as Promise<Row[]>,

    delete: (extra: SQL): Promise<Row[]> =>
      db.delete(anyTable).where(withScope(extra)).returning() as Promise<Row[]>,
  }
}

/**
 * The only sanctioned way to read or write org-scoped data server-side.
 * Resolves the signed-in user's org from their Supabase Auth session, then
 * returns query helpers pre-filtered to that org for every table.
 *
 * Correction (step 24 audit): this was previously documented as "an
 * application-level backstop on top of the Postgres RLS policies from step
 * 8, not a replacement for them." That's backwards. The org_org_isolation
 * policies (db/migrations) key off current_org_id(), which reads
 * auth.uid() — that only resolves when a query runs through Supabase's API
 * with a real user JWT (as Storage operations correctly do, see
 * db/storage-setup.sql). getDb() here connects directly via DATABASE_URL —
 * a plain Postgres connection with no JWT/session context — so auth.uid()
 * has nothing to resolve, and every table's ENABLE ROW LEVEL SECURITY
 * (without FORCE) doesn't apply to the owning/superuser-equivalent role
 * DATABASE_URL almost certainly connects as. worker/src/db.ts already
 * documented this correctly for its own connection ("the same privileged,
 * non-RLS-scoped DATABASE_URL"); this comment just hadn't caught up.
 *
 * In practice: org scoping here is the primary and, for this connection,
 * likely the *only* real enforcement — not a backstop. See
 * eslint.config.mjs for how direct access to the unscoped client
 * (lib/db/client.ts) is blocked everywhere except this file.
 *
 * Cached per request (like getCurrentMembership above) — this was a plain
 * async function until an audit found the root layout's
 * getProjectStateSnapshot() and a page's own data-loading action (e.g.
 * getEstimateData/getReconciliationData) each calling this independently,
 * every call returning a brand-new object with brand-new closures. That
 * defeated cache() on every *downstream* function too (getCurrentProject,
 * getOrCreateCurrentEstimate, ...): they key on this object by reference,
 * so a fresh scopedDb each time meant a fresh cache miss every time. This
 * is the one fix that makes all of those actually dedupe within a request.
 */
export const getScopedDb = cache(async function getScopedDb() {
  const { userId, orgId, role } = await getCurrentMembership()
  const db = getDb()

  return {
    orgId,
    userId,
    role,
    org: {
      get: async () => {
        const [row] = await db.select().from(orgs).where(eq(orgs.id, orgId)).limit(1)
        return row
      },
      // Keyed by the org's own id, not an org_id column — org is the one
      // table without one. Same org_id_isolation RLS policy still applies.
      update: async (
        values: Partial<Omit<typeof orgs.$inferInsert, "id">>,
      ) => {
        const [row] = await db
          .update(orgs)
          .set(values)
          .where(eq(orgs.id, orgId))
          .returning()
        return row
      },
    },
    users: orgScoped(users, users.orgId, orgId),
    projects: orgScoped(projects, projects.orgId, orgId),
    documents: orgScoped(documents, documents.orgId, orgId),
    costItems: orgScoped(costItems, costItems.orgId, orgId),
    bids: orgScoped(bids, bids.orgId, orgId),
    estimates: orgScoped(estimates, estimates.orgId, orgId),
    estimateLines: orgScoped(estimateLines, estimateLines.orgId, orgId),
    reconciliationItems: orgScoped(
      reconciliationItems,
      reconciliationItems.orgId,
      orgId,
    ),
    takeoffJobs: orgScoped(takeoffJobs, takeoffJobs.orgId, orgId),
    aiUsageEvents: orgScoped(aiUsageEvents, aiUsageEvents.orgId, orgId),
    invites: orgScoped(invites, invites.orgId, orgId),
    reviewRequests: orgScoped(reviewRequests, reviewRequests.orgId, orgId),
    subQuotes: orgScoped(subQuotes, subQuotes.orgId, orgId),
    quoteConditions: orgScoped(quoteConditions, quoteConditions.orgId, orgId),
    quoteLineItems: orgScoped(quoteLineItems, quoteLineItems.orgId, orgId),
  }
})
