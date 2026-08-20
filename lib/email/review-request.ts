import "server-only"

import { eq } from "drizzle-orm"

import { users } from "@/db/schema"
import type { ScopedDb } from "@/lib/current-project"
import { EMAIL_FROM, getResendClient } from "@/lib/email/client"
import { logger } from "@/lib/logger"

// requestReviewAction used to insert a row with status "requested" and
// return. Nothing read that row — no inbox, no queue, no notification —
// while the UI told the contractor "we'll follow up within 1–2 business
// days" (components/review/request-review-card.tsx). This makes that
// promise true.
//
// Deliberately loud when it can't deliver: a review request is time-bound
// against a bid deadline, so an unconfigured recipient or a Resend failure
// is logged at error level (which reaches Sentry, see lib/logger.ts) rather
// than warned and forgotten.

const SCOPE_LABELS: Record<string, string> = {
  full: "Full estimate review",
  reconciliation: "Bid-form reconciliation",
  discrepancy: "Flagged discrepancies",
  proposal: "Proposal / submission package",
}

function reviewInbox(): string | null {
  return process.env.REVIEW_NOTIFY_EMAIL?.trim() || null
}

export async function sendReviewRequestNotification(
  scopedDb: ScopedDb,
  request: {
    id: string
    projectName: string
    projectNumber: string
    scope: string[]
    notes: string | null
  },
): Promise<void> {
  const to = reviewInbox()
  if (!to) {
    logger.error("Review requested but REVIEW_NOTIFY_EMAIL is not configured", {
      orgId: scopedDb.orgId,
      reviewRequestId: request.id,
    })
    return
  }

  const resend = getResendClient()
  if (!resend) {
    logger.error("Review requested but RESEND_API_KEY is not configured", {
      orgId: scopedDb.orgId,
      reviewRequestId: request.id,
    })
    return
  }

  const [org, requester] = await Promise.all([
    scopedDb.org.get(),
    scopedDb.users.findFirst(eq(users.id, scopedDb.userId)),
  ])

  const orgName = org?.name ?? "Unknown org"
  const requestedBy = requester?.email ?? "unknown"
  const scopeLines = request.scope.map((s) => `- ${SCOPE_LABELS[s] ?? s}`).join("\n")

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      replyTo: requester?.email || undefined,
      subject: `Review requested — ${request.projectName} (#${request.projectNumber})`,
      text: [
        `${orgName} requested a review.`,
        "",
        `Project: ${request.projectName} (#${request.projectNumber})`,
        `Requested by: ${requestedBy}`,
        "",
        "Scope:",
        scopeLines,
        "",
        request.notes ? `Notes:\n${request.notes}` : "No notes provided.",
        "",
        `Request id: ${request.id}`,
        "The contractor has been told to expect a reply within 1–2 business days.",
      ].join("\n"),
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="margin-bottom: 4px;">Review requested</h2>
          <p style="color: #555;"><strong>${orgName}</strong> requested a review.</p>
          <table style="border-collapse: collapse; font-size: 14px; color: #555;">
            <tr><td style="padding: 2px 12px 2px 0;">Project</td><td><strong>${request.projectName}</strong> (#${request.projectNumber})</td></tr>
            <tr><td style="padding: 2px 12px 2px 0;">Requested by</td><td>${requestedBy}</td></tr>
          </table>
          <h3 style="margin-bottom: 4px; font-size: 14px;">Scope</h3>
          <ul style="color: #555; font-size: 14px; margin-top: 0;">
            ${request.scope.map((s) => `<li>${SCOPE_LABELS[s] ?? s}</li>`).join("")}
          </ul>
          ${
            request.notes
              ? `<h3 style="margin-bottom: 4px; font-size: 14px;">Notes</h3>
                 <p style="color: #555; font-size: 14px; white-space: pre-wrap;">${request.notes}</p>`
              : ""
          }
          <p style="color: #888; font-size: 12px; border-top: 1px solid #eee; padding-top: 12px;">
            Request id ${request.id} — the contractor has been told to expect a reply
            within 1&ndash;2 business days.
          </p>
        </div>
      `,
    })

    if (error) {
      logger.error(
        "Failed to send review request notification",
        { orgId: scopedDb.orgId, reviewRequestId: request.id },
        error,
      )
    }
  } catch (err) {
    logger.error(
      "Failed to send review request notification",
      { orgId: scopedDb.orgId, reviewRequestId: request.id },
      err,
    )
  }
}
