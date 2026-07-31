import { sql } from "./db.js"
import { processJob, type ClaimedJob } from "./process-job.js"

/**
 * Claims at most one queued job and processes it. Uses FOR UPDATE SKIP
 * LOCKED so that if Railway ever runs more than one instance of this
 * worker, they can poll concurrently without two instances grabbing the
 * same job.
 */
export async function pollOnce(): Promise<void> {
  const [job] = await sql<ClaimedJob[]>`
    update takeoff_job
    set status = 'running', updated_at = now()
    where id = (
      select id from takeoff_job
      where status = 'queued'
      order by created_at asc
      limit 1
      for update skip locked
    )
    returning id, org_id, document_id
  `

  if (!job) return

  await processJob(job)
}
