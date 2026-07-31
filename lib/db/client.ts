import "server-only"

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "@/db/schema"

// Not meant to be imported outside lib/db/scoped.ts — everywhere else must
// go through getScopedDb(), which applies org isolation on top of this raw
// client. Enforced by the no-restricted-imports rule in eslint.config.mjs.
//
// Lazily constructed (not built at module-evaluation time) so that merely
// importing this module — which now happens on every route via the root
// layout's project-state fetch — doesn't crash pages that never actually
// end up running a query. getScopedDb()'s callers already handle a missing
// DATABASE_URL as a normal thrown error at call time.
let instance: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (!instance) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set")
    }

    // prepare: false — required when connecting through Supabase's pooled
    // (Supavisor/PgBouncer, transaction-mode) connection string, which
    // doesn't support prepared statements. Harmless for a direct connection.
    const client = postgres(connectionString, { prepare: false })
    instance = drizzle(client, { schema })
  }
  return instance
}
