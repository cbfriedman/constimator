import "server-only"

import { checkSpendCap, checkTakeoffRateLimit, formatUsd } from "@/lib/ai-limits"
import { getBillingStatus } from "@/lib/billing"
import type { ScopedDb } from "@/lib/current-project"
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
      return
    }

    await scopedDb.takeoffJobs.insert({
      documentId,
      status: "queued",
    })
  } catch (err) {
    logger.error("Failed to queue takeoff job", { documentId }, err)
  }
}
