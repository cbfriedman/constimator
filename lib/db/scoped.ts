import "server-only"

import { cache } from "react"
import { and, eq, type SQL } from "drizzle-orm"
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core"

import {
  bids,
  costItems,
  documents,
  estimateLines,
  estimates,
  orgs,
  projects,
  reconciliationItems,
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

// Cached per request — if getScopedDb() is called from multiple server
// components/actions during one render, this resolves the signed-in user's
// org once instead of re-querying auth + the "user" table each time.
const getCurrentOrgId = cache(async (): Promise<string> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    throw new UnauthenticatedError()
  }

  const db = getDb()
  const [membership] = await db
    .select({ orgId: users.orgId })
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1)

  if (!membership) {
    throw new NoOrgMembershipError(authUser.id)
  }

  return membership.orgId
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
 * This is an application-level backstop on top of the Postgres RLS policies
 * from step 8, not a replacement for them — see eslint.config.mjs for how
 * direct access to the unscoped client (lib/db/client.ts) is blocked.
 */
export async function getScopedDb() {
  const orgId = await getCurrentOrgId()
  const db = getDb()

  return {
    orgId,
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
  }
}
