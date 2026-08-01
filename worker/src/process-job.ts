import { sql } from "./db.js"
import { downloadDocument } from "./download-document.js"
import { rasterizePdf } from "./rasterize.js"
import { extractQuantities } from "./extract.js"
import { checkSpendCap, checkTakeoffRateLimit, formatUsd, recordAiUsage } from "./ai-limits.js"
import type { TakeoffResult } from "./types.js"

export type ClaimedJob = {
  id: string
  org_id: string
  document_id: string
}

async function failJob(job: ClaimedJob, message: string): Promise<void> {
  await sql`
    update takeoff_job set status = 'failed', error = ${message}, updated_at = now()
    where id = ${job.id} and org_id = ${job.org_id}
  `
  await sql`
    update document set status = 'failed', updated_at = now()
    where id = ${job.document_id} and org_id = ${job.org_id}
  `
  console.error(`[job ${job.id}] failed: ${message}`)
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

    // Step 25: authoritative checks, immediately before the paid Claude
    // call — the app's confirmDocumentUpload already checked both at
    // queue time, but a job can sit queued across a rate-limit window
    // resetting or a new spend-cap month starting, so this is the check
    // that actually governs whether money gets spent.
    const rateLimit = await checkTakeoffRateLimit(job.org_id)
    if (!rateLimit.allowed) {
      await failJob(
        job,
        `Too many takeoff requests — please wait about ${rateLimit.retryAfterSeconds}s and try again.`,
      )
      return
    }

    const spendCap = await checkSpendCap(job.org_id)
    if (spendCap.overCap) {
      await failJob(
        job,
        `Your organization has reached its monthly AI usage limit (${formatUsd(spendCap.capUsd)} used this month). AI document processing is paused until next month — you can still upload documents and build your estimate manually.`,
      )
      return
    }

    await sql`
      update document set status = 'processing', updated_at = now()
      where id = ${job.document_id} and org_id = ${job.org_id}
    `

    const pdfBytes = await downloadDocument(document.storage_bucket, document.storage_path)
    const pages = await rasterizePdf(pdfBytes)
    const { items, usage } = await extractQuantities(pages)
    const result: TakeoffResult = { items }

    await recordAiUsage(job.org_id, "takeoff_extraction", usage.inputTokens, usage.outputTokens)

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
    await failJob(job, message)
  }
}
