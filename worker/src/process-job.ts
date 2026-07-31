import { sql } from "./db.js"
import { runTakeoffExtraction } from "./takeoff-stub.js"

export type ClaimedJob = {
  id: string
  org_id: string
  document_id: string
}

export async function processJob(job: ClaimedJob) {
  console.log(`[job ${job.id}] processing (document ${job.document_id})`)

  try {
    const [document] = await sql`
      select storage_bucket, storage_path, file_name
      from document
      where id = ${job.document_id} and org_id = ${job.org_id}
    `
    if (!document) {
      throw new Error(`Document ${job.document_id} not found (or not in org ${job.org_id})`)
    }

    const result = await runTakeoffExtraction({
      storage_bucket: document.storage_bucket,
      storage_path: document.storage_path,
      file_name: document.file_name,
    })

    await sql`
      update takeoff_job
      set status = 'complete', result = ${sql.json(result)}, updated_at = now()
      where id = ${job.id}
    `
    console.log(`[job ${job.id}] complete`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await sql`
      update takeoff_job
      set status = 'failed', error = ${message}, updated_at = now()
      where id = ${job.id}
    `
    console.error(`[job ${job.id}] failed: ${message}`)
  }
}
