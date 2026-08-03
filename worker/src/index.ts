import "dotenv/config"
// First import in the process — Sentry.init() needs to run before anything
// else can throw. See sentry.ts.
import "./sentry.js"

import { sql } from "./db.js"
import { pollOnce } from "./poll.js"
import { recordHeartbeat } from "./heartbeat.js"
import { logger } from "./logger.js"

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 5000)

let shuttingDown = false

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function loop() {
  while (!shuttingDown) {
    try {
      // Recorded every cycle regardless of whether a job was actually
      // claimed — the heartbeat means "the poll loop is alive," not "a job
      // ran." A stale heartbeat is what app/api/health treats as the
      // worker being down.
      await recordHeartbeat()
      await pollOnce()
    } catch (err) {
      // A failure claiming/reading a job (e.g. a transient connection
      // blip) — logged and retried next cycle. Failures *processing* a
      // claimed job are already caught inside processJob and recorded on
      // the job row itself; they never reach here.
      logger.error("Poll cycle failed", undefined, err)
    }
    await sleep(POLL_INTERVAL_MS)
  }
}

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down after the current poll cycle...`)
  shuttingDown = true
  await sql.end()
  process.exit(0)
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

logger.info(`Takeoff worker started — polling every ${POLL_INTERVAL_MS}ms`)
loop()
