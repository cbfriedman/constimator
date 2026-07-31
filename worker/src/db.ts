import postgres from "postgres"

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("DATABASE_URL is not set")
}

// Same privileged, non-RLS-scoped connection the app's own Drizzle client
// uses (lib/db/client.ts) — this worker has to service every org's queued
// jobs, not one caller's, so it can't go through the app's org-scoped
// helper (that requires a Supabase Auth session, which a headless worker
// doesn't have). Safety here comes from every query below being scoped to
// one job's own org_id/document_id, not from RLS restricting this
// connection — see the comment on the takeoff_job table in db/schema.ts.
export const sql = postgres(connectionString, { prepare: false })
