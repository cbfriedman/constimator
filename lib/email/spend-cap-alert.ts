import "server-only"

import { eq } from "drizzle-orm"

import { users } from "@/db/schema"
import { formatUsd } from "@/lib/ai-limits"
import type { ScopedDb } from "@/lib/current-project"
import { EMAIL_FROM, getResendClient } from "@/lib/email/client"
import { logger } from "@/lib/logger"

function startOfCurrentMonthUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

// The known gap docs/ALERTING.md flagged and scoped out: hitting the AI
// spend cap has the same practical effect on a bid deadline as an outage,
// but nothing notified the org admin — they'd only find out from an
// in-app error on their next upload attempt. Called from
// lib/takeoff-queue.ts right where that block already happens.
//
// Idempotent per calendar month via org.aiSpendCapAlertSentAt — a
// contractor blocked near a bid deadline may retry the same upload
// several times in a day, and this should notify once, not once per
// attempt.
export async function sendSpendCapAlertIfNeeded(
  scopedDb: ScopedDb,
  spentUsd: number,
  capUsd: number,
): Promise<void> {
  const resend = getResendClient()
  if (!resend) return

  const org = await scopedDb.org.get()
  if (!org) return

  if (
    org.aiSpendCapAlertSentAt &&
    org.aiSpendCapAlertSentAt >= startOfCurrentMonthUtc()
  ) {
    return
  }

  const admins = await scopedDb.users.findMany(eq(users.role, "admin"))
  const recipients = admins.map((admin) => admin.email).filter(Boolean)
  if (recipients.length === 0) {
    logger.warn("Spend cap hit but org has no admin to notify", {
      orgId: scopedDb.orgId,
    })
    return
  }

  const spent = formatUsd(spentUsd)
  const cap = formatUsd(capUsd)

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: recipients,
      subject: `${org.name} has reached its monthly AI usage limit on Constimator`,
      text: [
        `${org.name} has used ${spent} of its ${cap} monthly AI usage limit on Constimator.`,
        "",
        "AI document processing (reading plans, specs, and bid forms) is paused until next month. Uploading documents and building estimates manually both still work as normal.",
        "",
        "To raise the limit, reply to this email or reach out at support@constimator.com.",
      ].join("\n"),
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="margin-bottom: 4px;">Monthly AI usage limit reached</h2>
          <p style="color: #555;">
            <strong>${org.name}</strong> has used <strong>${spent}</strong> of its
            <strong>${cap}</strong> monthly AI usage limit on Constimator.
          </p>
          <p style="color: #555;">
            AI document processing (reading plans, specs, and bid forms) is paused
            until next month. Uploading documents and building estimates manually
            both still work as normal.
          </p>
          <p style="color: #555;">
            To raise the limit, reply to this email or reach out at
            <a href="mailto:support@constimator.com">support@constimator.com</a>.
          </p>
        </div>
      `,
    })

    if (error) {
      logger.error("Failed to send spend cap alert email", { orgId: scopedDb.orgId }, error)
      return
    }

    // Set the flag only after a confirmed send — a delivery failure
    // shouldn't silently suppress every retry attempt for the rest of
    // the month.
    await scopedDb.org.update({ aiSpendCapAlertSentAt: new Date() })
  } catch (err) {
    logger.error("Failed to send spend cap alert email", { orgId: scopedDb.orgId }, err)
  }
}
