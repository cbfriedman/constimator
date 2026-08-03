import "server-only"

import { getDb } from "./client"

/**
 * The only other sanctioned way to touch the database server-side, besides
 * getScopedDb() — for operational/system-level surfaces that legitimately
 * need visibility across every org, not one caller's. As of step 29 this is
 * exactly one caller: app/api/health, which reports on the worker's
 * heartbeat and takeoff_job queue health system-wide (an uptime check has
 * no "current org" to scope to).
 *
 * This bypasses org isolation entirely — treat any new caller of this as a
 * decision worth a second look, not a convenient shortcut around
 * getScopedDb(). In particular, nothing built on this should ever return
 * per-org identifying details (project names, document names, etc.) to a
 * caller — aggregate counts only, the same discipline app/api/health
 * follows.
 */
export function getSystemDb() {
  return getDb()
}
