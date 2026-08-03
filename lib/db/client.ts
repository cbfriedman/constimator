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
    //
    // max: 1 — found during a real production outage: each
    // Vercel serverless instance gets its own module-level `instance`
    // (see below), and Supabase's connection pooler caps total concurrent
    // clients across the whole database (small and fixed under session
    // mode, still finite under transaction mode). Without a per-instance
    // cap, a single request doing a couple of parallel queries could open
    // several connections from one serverless instance alone; multiplied
    // across however many instances Vercel runs concurrently under real
    // traffic, that exhausted the pool almost immediately. Capping each
    // instance to one connection trades a little intra-request query
    // parallelism for not taking the database down under load — worth it
    // even after DATABASE_URL is corrected to transaction-mode pooling
    // (see .env.example), since that only raises the ceiling, not removes it.
    const client = postgres(connectionString, { prepare: false, max: 1 })
    instance = drizzle(client, { schema })
  }
  return instance
}
