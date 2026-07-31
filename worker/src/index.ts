import "dotenv/config"

import { sql } from "./db.js"
import { pollOnce } from "./poll.js"

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 5000)

let shuttingDown = false

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function loop() {
  while (!shuttingDown) {
    try {
      await pollOnce()
    } catch (err) {
      // A failure claiming/reading a job (e.g. a transient connection
      // blip) — logged and retried next cycle. Failures *processing* a
      // claimed job are already caught inside processJob and recorded on
      // the job row itself; they never reach here.
      console.error("Poll cycle failed:", err)
    }
    await sleep(POLL_INTERVAL_MS)
  }
}

async function shutdown(signal: string) {
  console.log(`\nReceived ${signal}, shutting down after the current poll cycle...`)
  shuttingDown = true
  await sql.end()
  process.exit(0)
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

console.log(`Takeoff worker started — polling every ${POLL_INTERVAL_MS}ms`)
loop()
