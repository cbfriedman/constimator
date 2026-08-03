import { randomUUID } from "node:crypto"
import { spawn, type ChildProcess } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { config as loadEnv } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import postgres from "postgres"

import { generateLoadTestPdf } from "./generate-pdf.js"

// Reuses the worker's own real credentials rather than keeping a third
// copy — this script exercises the same live DB/Storage/Anthropic account
// the worker actually runs against.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, "../../..")
const WORKER_DIR = path.join(REPO_ROOT, "worker")
loadEnv({ path: path.join(WORKER_DIR, ".env") })

const CONCURRENCY = Number(process.env.LOAD_TEST_CONCURRENCY ?? 6)
const MONITOR_TIMEOUT_MS = 10 * 60 * 1000
const MONITOR_POLL_MS = 2000
const DOCUMENTS_BUCKET = "project-documents"

const DATABASE_URL = process.env.DATABASE_URL
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!DATABASE_URL || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing DATABASE_URL / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — check worker/.env",
  )
}

const sql = postgres(DATABASE_URL, { prepare: false })
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function log(msg: string) {
  console.log(`[load-test] ${new Date().toISOString()} ${msg}`)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type Cleanup = {
  authUserId?: string
  orgId?: string
  storagePaths: string[]
  workerProcess?: ChildProcess
}

const cleanup: Cleanup = { storagePaths: [] }

async function createTestOrgAndProject() {
  const runId = Date.now().toString(36)
  const email = `constimator-load-test-${runId}@constimator-test.invalid`
  const password = randomUUID()

  log(`Creating auth user ${email} (drives the real handle_new_user() org-provisioning trigger)`)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) {
    throw new Error(`Failed to create test auth user: ${error?.message}`)
  }
  cleanup.authUserId = data.user.id

  // The trigger runs as part of the same INSERT ... auth.users transaction,
  // so this should be visible immediately — a short bounded retry only
  // guards against any replication lag on Supabase's side, not app logic.
  let membership: { orgId: string }[] = []
  for (let attempt = 0; attempt < 5 && membership.length === 0; attempt++) {
    membership = await sql<{ orgId: string }[]>`
      select org_id as "orgId" from "user" where id = ${data.user.id}
    `
    if (membership.length === 0) await sleep(500)
  }
  if (membership.length === 0) {
    throw new Error("handle_new_user() trigger did not provision an org in time")
  }
  const orgId = membership[0].orgId
  cleanup.orgId = orgId

  const [org] = await sql`select name, slug from org where id = ${orgId}`
  log(`Test org provisioned: ${org.name} (${org.slug}), id=${orgId}`)

  const [project] = await sql`
    insert into project (org_id, name, number, owner, status)
    values (${orgId}, 'Load Test Project', 'LOADTEST-001', 'Load Test', 'documents')
    returning id
  `
  log(`Test project created: id=${project.id}`)

  return { orgId, projectId: project.id as string }
}

type QueuedUpload = {
  index: number
  documentId: string
  jobId: string
}

// Mirrors what app/upload/actions.ts's confirmDocumentUpload writes to the
// DB, without going through the Server Action / HTTP layer itself (that
// layer — zod validation, org-scoping, billing gate, queue-time rate
// limit/spend-cap check — was already exercised and hardened in steps
// 23-25/30/31; this script's job is to put the WORKER under concurrent
// load, so it reproduces the exact row state the worker sees rather than
// standing up a real signed-in browser session to get there).
async function queueUpload(
  orgId: string,
  projectId: string,
  index: number,
  pdfBytes: Buffer,
): Promise<QueuedUpload> {
  const storagePath = `${orgId}/${projectId}/${randomUUID()}-loadtest-${index}.pdf`

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, pdfBytes, { contentType: "application/pdf" })
  if (uploadError) {
    throw new Error(`Storage upload ${index} failed: ${uploadError.message}`)
  }
  cleanup.storagePaths.push(storagePath)

  const [document] = await sql`
    insert into document (org_id, project_id, type, file_name, storage_bucket, storage_path, mime_type, file_size_bytes, status)
    values (${orgId}, ${projectId}, 'bid_form', ${`loadtest-${index}.pdf`}, ${DOCUMENTS_BUCKET}, ${storagePath}, 'application/pdf', ${pdfBytes.length}, 'uploaded')
    returning id
  `
  const [job] = await sql`
    insert into takeoff_job (org_id, document_id, status)
    values (${orgId}, ${document.id}, 'queued')
    returning id
  `
  return { index, documentId: document.id, jobId: job.id }
}

function startWorker(): ChildProcess {
  log(`Spawning worker (node dist/index.js, cwd=${WORKER_DIR})`)
  const child = spawn("node", ["dist/index.js"], {
    cwd: WORKER_DIR,
    stdio: "inherit",
  })
  cleanup.workerProcess = child
  return child
}

type JobState = {
  status: string
  updatedAt: string
}

async function monitorJobs(jobIds: string[], t0: number) {
  const seen = new Map<string, JobState>()
  const transitions: { jobId: string; status: string; tMs: number }[] = []
  const deadline = Date.now() + MONITOR_TIMEOUT_MS

  while (Date.now() < deadline) {
    const rows = await sql<{ id: string; status: string; updated_at: string }[]>`
      select id, status, updated_at from takeoff_job where id = any(${jobIds})
    `
    for (const row of rows) {
      const prev = seen.get(row.id)
      if (!prev || prev.status !== row.status) {
        const tMs = Date.now() - t0
        transitions.push({ jobId: row.id, status: row.status, tMs })
        log(`job ${row.id.slice(0, 8)} -> ${row.status} (+${(tMs / 1000).toFixed(1)}s)`)
        seen.set(row.id, { status: row.status, updatedAt: row.updated_at })
      }
    }
    const allTerminal = rows.every((r) => r.status === "complete" || r.status === "failed")
    if (allTerminal && rows.length === jobIds.length) {
      return { transitions, timedOut: false }
    }
    await sleep(MONITOR_POLL_MS)
  }
  log("Monitoring timed out before all jobs reached a terminal state.")
  return { transitions, timedOut: true }
}

async function stopWorker(child: ChildProcess) {
  if (child.exitCode !== null) return
  log("Stopping worker...")
  child.kill("SIGTERM")
  const exited = await Promise.race([
    new Promise<boolean>((resolve) => child.once("exit", () => resolve(true))),
    sleep(10_000).then(() => false),
  ])
  if (!exited) {
    log("Worker did not exit within 10s of SIGTERM — sending SIGKILL")
    child.kill("SIGKILL")
  }
}

async function runCleanup() {
  log("--- Cleanup ---")
  if (cleanup.workerProcess) {
    await stopWorker(cleanup.workerProcess)
  }
  if (cleanup.storagePaths.length > 0) {
    const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).remove(cleanup.storagePaths)
    if (error) log(`WARNING: failed to remove storage objects: ${error.message}`)
    else log(`Removed ${cleanup.storagePaths.length} storage object(s)`)
  }
  if (cleanup.orgId) {
    // Cascades project/document/takeoff_job/bid/estimate/estimate_line/
    // reconciliation_item/ai_usage_event/invite/user (all org_id FKs are
    // ON DELETE CASCADE — see db/schema.ts).
    await sql`delete from org where id = ${cleanup.orgId}`
    log(`Deleted test org ${cleanup.orgId} (cascaded all associated rows)`)
  }
  if (cleanup.authUserId) {
    const { error } = await supabase.auth.admin.deleteUser(cleanup.authUserId)
    if (error) log(`WARNING: failed to delete auth user: ${error.message}`)
    else log(`Deleted auth user ${cleanup.authUserId}`)
  }

  // Verify nothing was left behind.
  if (cleanup.orgId) {
    const [remaining] = await sql`select count(*)::int as n from org where id = ${cleanup.orgId}`
    if (remaining.n > 0) log("WARNING: org row still present after cleanup!")
    else log("Verified: test org fully removed.")
  }
}

async function main() {
  log(`Starting bounded load test — concurrency=${CONCURRENCY}`)
  const { orgId, projectId } = await createTestOrgAndProject()

  log("Generating synthetic test PDF (2 pages)")
  const pdfBytes = await generateLoadTestPdf(`n=${CONCURRENCY}`)

  log(`Firing ${CONCURRENCY} concurrent uploads...`)
  const t0 = Date.now()
  const uploads = await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, i) => queueUpload(orgId, projectId, i, pdfBytes)),
  )
  const queueElapsedMs = Date.now() - t0
  log(`All ${CONCURRENCY} uploads queued in ${queueElapsedMs}ms`)

  const worker = startWorker()
  const { transitions, timedOut } = await monitorJobs(
    uploads.map((u) => u.jobId),
    t0,
  )
  await stopWorker(worker)
  cleanup.workerProcess = undefined

  const finalRows = await sql`
    select id, status, error from takeoff_job where id = any(${uploads.map((u) => u.jobId)})
  `
  const usage = await sql`
    select kind, input_tokens, output_tokens, estimated_cost_usd
    from ai_usage_event where org_id = ${orgId} order by created_at asc
  `

  console.log("\n=== RESULTS ===")
  console.log(`Concurrency: ${CONCURRENCY}`)
  console.log(`Queue-time (all ${CONCURRENCY} inserts): ${queueElapsedMs}ms`)
  console.log(`Timed out waiting for completion: ${timedOut}`)
  console.log("\nFinal job states:")
  for (const row of finalRows) {
    console.log(`  ${row.id.slice(0, 8)}: ${row.status}${row.error ? ` — ${row.error}` : ""}`)
  }
  console.log("\nAI usage recorded:")
  for (const row of usage) {
    console.log(
      `  ${row.kind}: ${row.input_tokens} in / ${row.output_tokens} out, $${row.estimated_cost_usd}`,
    )
  }
  const totalCost = usage.reduce((sum, r) => sum + Number(r.estimated_cost_usd), 0)
  console.log(`Total estimated cost: $${totalCost.toFixed(4)}`)

  const lastTransition = transitions[transitions.length - 1]
  if (lastTransition) {
    console.log(
      `\nTotal wall-clock from first queue to last terminal state: ${(lastTransition.tMs / 1000).toFixed(1)}s`,
    )
  }

  return { transitions, finalRows, usage, totalCost, queueElapsedMs, timedOut, concurrency: CONCURRENCY }
}

main()
  .catch((err) => {
    console.error("Load test failed:", err)
    process.exitCode = 1
  })
  .finally(async () => {
    await runCleanup()
    await sql.end()
  })
