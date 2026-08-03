import { createHash, timingSafeEqual } from "node:crypto"

import { NextResponse } from "next/server"

import { getHealthStatus } from "@/lib/health-check"
import { logger } from "@/lib/logger"

// Found during the step 30 security review: a plain !== compares strings
// byte-by-byte and returns as soon as it finds a mismatch, so how long the
// comparison takes leaks how many leading characters of a guess were
// right — a timing side-channel against the token. SHA-256 both sides
// first (fixed-length digest, sidesteps timingSafeEqual's requirement
// that both buffers be the same length) and compare the digests instead.
// Realistically low-severity here (network jitter dwarfs this over the
// internet, and the token isn't gating anything more sensitive than
// aggregate operational counts) but it's a one-line fix for something
// that's easy to get wrong, so it's worth just doing correctly.
function tokensMatch(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a).digest()
  const digestB = createHash("sha256").update(b).digest()
  return timingSafeEqual(digestA, digestB)
}

// Step 29 — uptime check target for the Railway worker (step 17) and its
// takeoff_job queue. Point an external uptime monitor (Better Uptime,
// UptimeRobot, Checkly, etc. — nothing configured here, this just needs to
// be reachable for one to poll) at this URL. Step 37 adds a second,
// self-contained caller of the same underlying check (lib/health-check.ts):
// app/api/cron/uptime-check, triggered by Vercel Cron, which reports
// straight to Sentry — so alerting doesn't strictly depend on a
// third-party monitor being configured at all, though one is still
// recommended (see docs/ALERTING.md) for the case where Vercel itself is
// unreachable, which a Vercel Cron job obviously can't detect.
//
// Deliberately doesn't live on the worker itself — worker/README.md
// documents why it has no public port ("not a web service"), and that
// reasoning still holds: nothing about the worker's own job needs it to
// accept inbound traffic. This app already has to be publicly reachable
// anyway, so it's the natural place to answer "is the worker OK" by
// reading the heartbeat the worker writes on every poll cycle
// (worker/src/heartbeat.ts) plus the takeoff_job queue's own state —
// both from the database, not from asking the worker process directly.
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")
  const expectedToken = process.env.HEALTH_CHECK_TOKEN

  // Optional on purpose — if it's not set, the endpoint is open (fine for
  // local/dev). Set HEALTH_CHECK_TOKEN in production so this can't be
  // polled by anyone who finds the URL; point your uptime monitor at
  // /api/health?token=<the same value>.
  if (expectedToken && (!token || !tokensMatch(token, expectedToken))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await getHealthStatus()
    return NextResponse.json(body, { status: body.status === "ok" ? 200 : 503 })
  } catch (err) {
    logger.error("Health check failed", undefined, err)
    return NextResponse.json(
      { status: "error", error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
