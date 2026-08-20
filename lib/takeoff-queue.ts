import "server-only"

import { checkSpendCap, checkTakeoffRateLimit, formatUsd } from "@/lib/ai-limits"
import { getBillingStatus } from "@/lib/billing"
import type { ScopedDb } from "@/lib/current-project"
import { sendSpendCapAlertIfNeeded } from "@/lib/email/spend-cap-alert"
import { logger } from "@/lib/logger"

// Shared by app/upload/actions.ts (confirmDocumentUpload, the initial
// queue) and app/processing/actions.ts (retryTakeoffJobAction, re-queuing
// a failed one) — both need the exact same entitlement/rate-limit/
// spend-cap gate before inserting a takeoff_job row, and having it in one
// place means a retry can't accidentally skip a check the original queue
// path enforces.
export async function queueTakeoffJob(
  scopedDb: ScopedDb,
  documentId: string,
): Promise<void> {
  try {
    // Step 31: the page-level gate (components/billing-gate.tsx) already
    // keeps a non-entitled org off the normal UI flow — checked again here
    // for the same reason every other check here is checked again here
    // (step 30): this is the path that actually spends money, and it's
    // reachable on its own regardless of which page called it.
    const org = await scopedDb.org.get()
    if (!org || !getBillingStatus(org).isEntitled) {
      await scopedDb.takeoffJobs.insert({
        documentId,
        status: "failed",
        error: "Your organization's trial has ended. Subscribe to continue using AI document processing.",
      })
      return
    }

    const rateLimit = await checkTakeoffRateLimit(scopedDb.orgId)
    if (!rateLimit.allowed) {
      await scopedDb.takeoffJobs.insert({
        documentId,
        status: "failed",
        error: `Too many takeoff requests — please wait about ${rateLimit.retryAfterSeconds}s and try again.`,
      })
      return
    }

    const spendCap = await checkSpendCap(scopedDb)
    if (spendCap.overCap) {
      await scopedDb.takeoffJobs.insert({
        documentId,
        status: "failed",
        error: `Your organization has reached its monthly AI usage limit (${formatUsd(spendCap.capUsd)} used this month). AI document processing is paused until next month — you can still upload documents and build your estimate manually.`,
      })
      // docs/ALERTING.md's known adjacent gap: this has the same practical
      // effect on a bid deadline as an outage, so the admin should hear
      // about it without needing to notice the in-app error themselves.
      await sendSpendCapAlertIfNeeded(scopedDb, spendCap.spentUsd, spendCap.capUsd)
      return
    }

    await scopedDb.takeoffJobs.insert({
      documentId,
      status: "queued",
    })
  } catch (err) {
    logger.error("Failed to queue takeoff job", { documentId }, err)

    // Every deliberate rejection above writes a `failed` job row carrying a
    // message the user can actually read on /processing. An unexpected
    // throw used to write nothing at all, so the document sat with no job
    // and no explanation — indistinguishable, from the contractor's side,
    // from a queue that was merely slow. On a bid deadline that's the worst
    // possible failure mode, so record it the same way as the rest.
    try {
      await scopedDb.takeoffJobs.insert({
        documentId,
        status: "failed",
        error:
          "Something went wrong starting AI processing for this document. Try again, or contact support if it keeps happening — you can still build your estimate manually in the meantime.",
      })
    } catch (insertErr) {
      // The database itself is the most likely reason we got here, so this
      // second write can fail too. Nothing left to do but make sure it's
      // visible.
      logger.error(
        "Failed to record a failed takeoff job after a queue error",
        { documentId },
        insertErr,
      )
    }
  }
}
