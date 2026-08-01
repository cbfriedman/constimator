import { sql } from "./db.js"
import { downloadDocument } from "./download-document.js"
import { rasterizePdf } from "./rasterize.js"
import { extractQuantities } from "./extract.js"
import type { TakeoffResult } from "./types.js"

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

    await sql`
      update document set status = 'processing', updated_at = now()
      where id = ${job.document_id} and org_id = ${job.org_id}
    `

    const pdfBytes = await downloadDocument(document.storage_bucket, document.storage_path)
    const pages = await rasterizePdf(pdfBytes)
    const items = await extractQuantities(pages)
    const result: TakeoffResult = { items }

    await sql`
      update takeoff_job
      set status = 'complete', result = ${sql.json(result)}, updated_at = now()
      where id = ${job.id} and org_id = ${job.org_id}
    `
    await sql`
      update document set status = 'processed', updated_at = now()
      where id = ${job.document_id} and org_id = ${job.org_id}
    `
    console.log(`[job ${job.id}] complete — extracted ${items.length} item(s)`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await sql`
      update takeoff_job
      set status = 'failed', error = ${message}, updated_at = now()
      where id = ${job.id} and org_id = ${job.org_id}
    `
    await sql`
      update document set status = 'failed', updated_at = now()
      where id = ${job.document_id} and org_id = ${job.org_id}
    `
    console.error(`[job ${job.id}] failed: ${message}`)
  }
}
