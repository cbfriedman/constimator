import { sql } from "./db.js"
import { downloadDocument } from "./download-document.js"
import { rasterizePdf } from "./rasterize.js"
import { extractQuantities } from "./extract.js"
import { extractBidForm } from "./extract-bid-form.js"
import { checkSpendCap, checkTakeoffRateLimit, formatUsd, recordAiUsage } from "./ai-limits.js"
import { captureTakeoffCompleted } from "./analytics.js"
import { logger } from "./logger.js"
import type { TakeoffResult } from "./types.js"

export type ClaimedJob = {
  id: string
  org_id: string
  document_id: string
}

// error is optional — pass the actual caught exception when there is one
// (an unexpected failure) so Sentry gets a real stack trace, not just a
// message. The rate-limit/spend-cap paths below aren't bugs, they're
// expected control flow, so they don't pass one.
async function failJob(job: ClaimedJob, message: string, error?: unknown): Promise<void> {
  await sql`
    update takeoff_job set status = 'failed', error = ${message}, updated_at = now()
    where id = ${job.id} and org_id = ${job.org_id}
  `
  await sql`
    update document set status = 'failed', updated_at = now()
    where id = ${job.document_id} and org_id = ${job.org_id}
  `
  logger.error(
    "Takeoff job failed",
    { jobId: job.id, orgId: job.org_id, documentId: job.document_id, reason: message },
    error,
  )
}

export async function processJob(job: ClaimedJob) {
  logger.info("Processing takeoff job", { jobId: job.id, orgId: job.org_id, documentId: job.document_id })

  try {
    const [document] = await sql`
      select storage_bucket, storage_path, file_name, type
      from document
      where id = ${job.document_id} and org_id = ${job.org_id}
    `
    if (!document) {
      throw new Error(`Document ${job.document_id} not found (or not in org ${job.org_id})`)
    }

    // Step 30 security review: downloadDocument uses the service-role key,
    // which bypasses Supabase Storage's own RLS entirely — this worker has
    // no session for Storage to check against, that's the whole reason it
    // needs the service-role key in the first place. app/upload/actions.ts's
    // confirmDocumentUpload now guarantees a document's storage_path always
    // starts with its own org_id, but this is the one place that actually
    // performs the RLS-bypassing download, so it gets its own check too
    // rather than trusting that guarantee was never violated upstream (by a
    // bug, or a future code path that writes a document row some other way).
    if (!document.storage_path.startsWith(`${job.org_id}/`)) {
      throw new Error(
        `Document ${job.document_id}'s storage path doesn't match its own org — refusing to download.`,
      )
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

    // Step 40: which extractor runs is decided by the document's own type,
    // set at upload time. A bid form is transcribed (the quantities are
    // printed on it); everything else goes through the plan-sheet takeoff.
    // The two write different fields of `result` — see types.ts — so a bid
    // form's items can't be mistaken for extracted estimate quantities
    // downstream.
    const isBidForm = document.type === "bid_form"
    let result: TakeoffResult
    let usage: { inputTokens: number; outputTokens: number }
    let itemCount: number

    if (isBidForm) {
      const extracted = await extractBidForm(pdfBytes)
      result = { kind: "bid_form", bidItems: extracted.items }
      usage = extracted.usage
      itemCount = extracted.items.length
      if (extracted.documentNotes) {
        logger.info("Bid form extraction notes", {
          jobId: job.id,
          documentId: job.document_id,
          documentNotes: extracted.documentNotes,
        })
      }
    } else {
      const pages = await rasterizePdf(pdfBytes)
      const extracted = await extractQuantities(pages)
      result = { kind: "plan_takeoff", items: extracted.items }
      usage = extracted.usage
      itemCount = extracted.items.length
    }

    await recordAiUsage(
      job.org_id,
      isBidForm ? "bid_form_extraction" : "takeoff_extraction",
      usage.inputTokens,
      usage.outputTokens,
    )

    await sql`
      update takeoff_job
      set status = 'complete', result = ${sql.json(result)}, updated_at = now()
      where id = ${job.id} and org_id = ${job.org_id}
    `
    await sql`
      update document set status = 'processed', updated_at = now()
      where id = ${job.document_id} and org_id = ${job.org_id}
    `
    logger.info("Takeoff job complete", {
      jobId: job.id,
      orgId: job.org_id,
      documentId: job.document_id,
      kind: result.kind,
      itemCount,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    })

    await captureTakeoffCompleted(job.org_id, {
      jobId: job.id,
      documentId: job.document_id,
      itemCount,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await failJob(job, message, err)
  }
}
