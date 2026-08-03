import "server-only"

import { and, inArray, lt } from "drizzle-orm"

import { takeoffJobs, workerHeartbeats } from "@/db/schema"
import { getSystemDb } from "@/lib/db/system"

// Shared by app/api/health (for an external uptime monitor to poll) and
// app/api/cron/uptime-check (step 37 — a Vercel Cron job that polls this
// itself, so an unhealthy worker/queue produces a Sentry alert without
// depending on a third-party monitor being configured at all). Pulled out
// of the route handler so both call the same logic once instead of one
// calling the other over HTTP.

// Generous relative to the worker's default 5s poll interval — flags a
// truly stuck/crashed worker, not one slow cycle.
const STALE_HEARTBEAT_SECONDS = 60
// A job sitting in queued/running this long is almost certainly stuck
// (a crashed worker mid-job, or a claim that never got picked up).
const STUCK_JOB_MINUTES = 15

export type HealthStatus = {
  status: "ok" | "degraded"
  worker: {
    healthy: boolean
    lastPolledAt: string | null
    heartbeatAgeSeconds: number | null
  }
  queue: {
    healthy: boolean
    stuckJobCount: number
  }
}

// Aggregate counts only — never per-org detail. There's no "current org"
// here (see lib/db/system.ts), and this must never leak which org
// anything belongs to.
export async function getHealthStatus(): Promise<HealthStatus> {
  const db = getSystemDb()
  const now = Date.now()

  const [heartbeat] = await db.select().from(workerHeartbeats).limit(1)
  const heartbeatAgeSeconds = heartbeat
    ? Math.round((now - heartbeat.lastPolledAt.getTime()) / 1000)
    : null
  const workerHealthy = heartbeatAgeSeconds != null && heartbeatAgeSeconds <= STALE_HEARTBEAT_SECONDS

  const stuckThreshold = new Date(now - STUCK_JOB_MINUTES * 60 * 1000)
  const stuckJobs = await db
    .select({ id: takeoffJobs.id })
    .from(takeoffJobs)
    .where(
      and(
        inArray(takeoffJobs.status, ["queued", "running"]),
        lt(takeoffJobs.updatedAt, stuckThreshold),
      ),
    )
  const queueHealthy = stuckJobs.length === 0

  return {
    status: workerHealthy && queueHealthy ? "ok" : "degraded",
    worker: {
      healthy: workerHealthy,
      lastPolledAt: heartbeat?.lastPolledAt.toISOString() ?? null,
      heartbeatAgeSeconds,
    },
    queue: {
      healthy: queueHealthy,
      stuckJobCount: stuckJobs.length,
    },
  }
}
