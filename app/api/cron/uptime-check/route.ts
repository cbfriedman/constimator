import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { getHealthStatus } from "@/lib/health-check"
import { logger } from "@/lib/logger"

// Step 37 — makes alerting self-triggering instead of depending entirely
// on a third-party uptime monitor being configured (app/api/health exists
// for that too, but "nothing configured here" was true right up until a
// real contractor could actually be mid-bid when the worker goes down).
// Vercel Cron (see vercel.json) hits this on a schedule; when the worker/
// queue is unhealthy, it reports straight to Sentry with a stable
// fingerprint so repeated failures group into one ongoing issue instead of
// paging once per cron tick — a Sentry Alert Rule on this project (see
// docs/ALERTING.md for the one-time setup) turns that into an actual
// email/Slack/PagerDuty page.
//
// Still recommend a real external monitor alongside this (docs/ALERTING.md
// again) — this check only runs if Vercel itself is up and cron-triggering
// it, so it can't catch "the whole app is unreachable," only "the app is
// reachable but the worker/queue behind it isn't."
export const dynamic = "force-dynamic"

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  // Optional on purpose, same as HEALTH_CHECK_TOKEN — open in local/dev
  // where CRON_SECRET isn't set. Vercel automatically sends this header
  // on cron-triggered requests when CRON_SECRET is configured in the
  // project's environment variables (see docs/ALERTING.md).
  if (!secret) return true
  return request.headers.get("authorization") === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const health = await getHealthStatus()

    if (health.status !== "ok") {
      const reasons: string[] = []
      if (!health.worker.healthy) reasons.push("worker heartbeat stale")
      if (!health.queue.healthy) reasons.push("takeoff_job queue stuck")

      // logger.warn (not .error) deliberately — .error would also fire its
      // own untagged Sentry.captureMessage (see lib/logger.ts), grouped by
      // message text alone. The explicit call below is the one Sentry
      // report this path should produce, with a stable fingerprint (rather
      // than Sentry's default grouping) so every degraded tick for the
      // same underlying cause lands in one ongoing issue — an outage
      // should read as one alert getting worse, not a new page every 5
      // minutes.
      logger.warn(`Uptime check: system degraded (${reasons.join(", ")})`, { health })
      Sentry.captureMessage("Uptime check: system degraded", {
        level: "error",
        fingerprint: ["uptime-check-degraded"],
        tags: { alert: "worker-down", component: "uptime-check" },
        extra: { health, reasons },
      })
    }

    return NextResponse.json(health, { status: health.status === "ok" ? 200 : 503 })
  } catch (err) {
    logger.error("Uptime check itself failed", undefined, err)
    return NextResponse.json(
      { status: "error", error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
