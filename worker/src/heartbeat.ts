import { sql } from "./db.js"

// Upserts the single worker_heartbeat row (step 29) — app/api/health reads
// this to tell "worker is alive and polling" apart from "worker is down",
// without the worker needing to expose a port of its own.
export async function recordHeartbeat(): Promise<void> {
  await sql`
    insert into worker_heartbeat (id, last_polled_at, updated_at)
    values ('worker', now(), now())
    on conflict (id) do update set last_polled_at = now(), updated_at = now()
  `
}
