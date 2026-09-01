import { sql } from "./db.js"
import { downloadDocument } from "./download-document.js"
import { rasterizePdf } from "./rasterize.js"
import { extractQuantities } from "./extract.js"
import { extractBidForm } from "./extract-bid-form.js"
import { extractQuoteConditions } from "./extract-quote-conditions.js"
import { extractPlanHolders } from "./extract-plan-holders.js"
import { extractParticipationGoals } from "./extract-participation-goals.js"
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
  // Step 41. A no-op for every document that isn't a sub quote. sub_quote
  // carries its own status because a document being "processed" and a quote
  // being reviewed are different milestones (see db/schema.ts) — but a
  // failure is a failure for both, and leaving the quote stuck on
  // "extracting" would make a dead job look like a running one.
  await sql`
    update sub_quote set status = 'failed', updated_at = now()
    where document_id = ${job.document_id} and org_id = ${job.org_id}
  `
  // Same reasoning as the sub_quote update above, for plan holder lists: a
  // no-op for every other document type, and it stops a dead job from
  // leaving a list stuck on "extracting" forever.
  await sql`
    update plan_holder_list set status = 'failed', updated_at = now()
    where document_id = ${job.document_id} and org_id = ${job.org_id}
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
      select storage_bucket, storage_path, file_name, type, mime_type
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
    // No-op unless this document is a sub quote. Paired with the
    // needs_review update after extraction and the failed update in
    // failJob(), so a quote's status always reflects where it actually is.
    await sql`
      update sub_quote set status = 'extracting', updated_at = now()
      where document_id = ${job.document_id} and org_id = ${job.org_id}
    `
    await sql`
      update plan_holder_list set status = 'extracting', updated_at = now()
      where document_id = ${job.document_id} and org_id = ${job.org_id}
    `

    const fileBytes = await downloadDocument(document.storage_bucket, document.storage_path)

    // Step 40, extended in step 41 and again for plan holders and specs:
    // which extractor runs is decided by the document's own type, set at
    // upload time. A bid form is transcribed (the quantities are printed on
    // it), a sub quote is read for the conditions attached to its price, a
    // plan holders list is parsed for who else pulled the documents, a
    // specifications document is read for the participation requirement it
    // imposes, and everything else goes through the plan-sheet takeoff. Each
    // writes a different field of `result` — see types.ts — so one kind's
    // output can't be mistaken for another's downstream.
    //
    // Specs used to fall through to the plan-sheet takeoff, which was wrong
    // in a way worth naming: that path rasterizes the first 20 pages and
    // measures quantities off them, and its results are the ones that feed
    // generateEstimateFromTakeoff. Running it over a spec book produced
    // quantities nobody measured, filed under kind "plan_takeoff", which put
    // them straight into the estimate. Routing specs here ends that as well
    // as reading the goal.
    let result: TakeoffResult
    let usage: { model: string; inputTokens: number; outputTokens: number }
    let itemCount: number
    let usageKind: string

    if (document.type === "bid_form") {
      const extracted = await extractBidForm(fileBytes)
      result = { kind: "bid_form", bidItems: extracted.items }
      usage = extracted.usage
      itemCount = extracted.items.length
      usageKind = "bid_form_extraction"
      if (extracted.documentNotes) {
        logger.info("Bid form extraction notes", {
          jobId: job.id,
          documentId: job.document_id,
          documentNotes: extracted.documentNotes,
        })
      }
    } else if (document.type === "sub_quote") {
      // The only extractor that takes a mime type: a sub quote is as likely
      // to be a phone photo of a fax as a PDF, and the two need different
      // content blocks. Falls back to PDF when mime_type is somehow null —
      // the upload path always records one, and PDF is the safer guess for a
      // document that got here without it.
      const extracted = await extractQuoteConditions(
        fileBytes,
        document.mime_type ?? "application/pdf",
      )
      result = {
        kind: "sub_quote",
        conditions: extracted.conditions,
        quoteTotalAmount: extracted.quoteTotalAmount,
        documentNotes: extracted.documentNotes,
      }
      usage = extracted.usage
      itemCount = extracted.conditions.length
      usageKind = "quote_conditions_extraction"
      if (extracted.documentNotes) {
        logger.info("Sub quote extraction notes", {
          jobId: job.id,
          documentId: job.document_id,
          documentNotes: extracted.documentNotes,
        })
      }
    } else if (document.type === "plan_holders") {
      const extracted = await extractPlanHolders(fileBytes)
      result = {
        kind: "plan_holders",
        planHolders: extracted.holders,
        planHoldersIssuedOn: extracted.issuedOn,
        documentNotes: extracted.documentNotes,
      }
      usage = extracted.usage
      itemCount = extracted.holders.length
      usageKind = "plan_holders_extraction"
      if (extracted.documentNotes) {
        logger.info("Plan holders extraction notes", {
          jobId: job.id,
          documentId: job.document_id,
          documentNotes: extracted.documentNotes,
        })
      }
    } else if (document.type === "specifications") {
      const extracted = await extractParticipationGoals(fileBytes)
      result = {
        kind: "specifications",
        participationGoals: extracted.goals,
        specLinks: extracted.links,
        documentNotes: extracted.documentNotes,
      }
      usage = extracted.usage
      itemCount = extracted.goals.length
      usageKind = "participation_goals_extraction"
      if (extracted.documentNotes) {
        logger.info("Specifications extraction notes", {
          jobId: job.id,
          documentId: job.document_id,
          documentNotes: extracted.documentNotes,
        })
      }
    } else {
      const pages = await rasterizePdf(fileBytes)
      const extracted = await extractQuantities(pages)
      result = { kind: "plan_takeoff", items: extracted.items }
      usage = extracted.usage
      itemCount = extracted.items.length
      usageKind = "takeoff_extraction"
    }

    await recordAiUsage(job.org_id, usageKind, usage.model, usage.inputTokens, usage.outputTokens)

    await sql`
      update takeoff_job
      set status = 'complete', result = ${sql.json(result)}, updated_at = now()
      where id = ${job.id} and org_id = ${job.org_id}
    `
    await sql`
      update document set status = 'processed', updated_at = now()
      where id = ${job.document_id} and org_id = ${job.org_id}
    `
    // "needs_review", not "confirmed": extraction finishing is precisely the
    // moment a human hasn't looked at it yet. Only the review screen moves a
    // quote to confirmed. No-op for non-quote documents.
    await sql`
      update sub_quote set status = 'needs_review', updated_at = now()
      where document_id = ${job.document_id} and org_id = ${job.org_id}
    `
    // Same gate for a plan holder list. The contacts themselves are
    // materialised on first read of the review screen (see
    // app/plan-holders/actions.ts), matching how quote conditions work.
    await sql`
      update plan_holder_list set status = 'needs_review', updated_at = now()
      where document_id = ${job.document_id} and org_id = ${job.org_id}
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
