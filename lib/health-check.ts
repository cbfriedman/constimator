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
  config: {
    healthy: boolean
    /** Names only — never values. This response is reachable by an external uptime monitor. */
    placeholderVars: string[]
  }
}

// Environment variables whose value is required for the product to work at
// all, checked here because a deployment can start, build, and serve pages
// with every one of them still set to the literal placeholder text from
// .env.example. That is not hypothetical: the working copy this check was
// added to had a .env.local byte-identical to .env.example, which meant
// nothing could run and nothing said so.
//
// Names only in the output — this endpoint is meant to be polled by an
// external monitor, so it must never echo a value back.
const REQUIRED_CONFIG_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "DATABASE_URL",
] as const

// Substrings that only ever appear in .env.example's illustrative values.
const PLACEHOLDER_MARKERS = ["YOUR_PROJECT_REF", "YOUR_PASSWORD", "YOUR_REGION", "your_anon_key"]

function findPlaceholderConfig(): string[] {
  return REQUIRED_CONFIG_VARS.filter((name) => {
    const value = process.env[name]
    if (!value) return true
    return PLACEHOLDER_MARKERS.some((marker) => value.includes(marker))
  })
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

  const placeholderVars = findPlaceholderConfig()
  const configHealthy = placeholderVars.length === 0

  return {
    status: workerHealthy && queueHealthy && configHealthy ? "ok" : "degraded",
    worker: {
      healthy: workerHealthy,
      lastPolledAt: heartbeat?.lastPolledAt.toISOString() ?? null,
      heartbeatAgeSeconds,
    },
    queue: {
      healthy: queueHealthy,
      stuckJobCount: stuckJobs.length,
    },
    config: {
      healthy: configHealthy,
      placeholderVars,
    },
  }
}
