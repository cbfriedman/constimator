import "server-only"

import { PostHog } from "posthog-node"

import { logger } from "@/lib/logger"

// Lazily constructed, same pattern as every other credential-gated
// integration in this app (getDb(), getStripe(), ...). One key covers
// both sides — NEXT_PUBLIC_ vars are still readable via process.env
// server-side, they're just *also* inlined into the client bundle (see
// instrumentation-client.ts) — so there's no separate secret server key
// the way Sentry's setup needed, PostHog project API keys aren't secret.
let instance: PostHog | null = null

function getPostHogClient(): PostHog | null {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!apiKey) return null
  if (!instance) {
    instance = new PostHog(apiKey, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    })
  }
  return instance
}

// The core flows step 34 asked to instrument that happen in the main
// app (as opposed to the worker, which has its own copy — see
// worker/src/analytics.ts — and the export button, which is
// client-side-only since there's no real export to hook into server-side,
// see components/reports/reports-shell.tsx). A union rather than a bare
// string so a typo in an event name is a type error, not a silently
// missing event in PostHog.
type AnalyticsEvent =
  | "project_created"
  | "document_uploaded"
  | "reconciliation_computed"
  // Step 41. Kept distinct from document_uploaded even though a sub quote is
  // also a document — the question these answer is different ("how many subs
  // is a prime actually comparing?" vs "how many project documents were
  // uploaded?"), and merging them would make both unanswerable.
  | "sub_quote_uploaded"
  // Distinct from document_uploaded for the same reason sub_quote_uploaded
  // is: the question is "how many jobs is a contractor sizing up the
  // competition on?", which merging into the generic upload count would make
  // unanswerable.
  | "plan_holder_list_uploaded"
  | "bid_form_imported"

/**
 * Fires a product analytics event tied to a real user, grouped by org
 * (PostHog's Group Analytics — the natural fit for a B2B app where the
 * unit that matters is usually the org, not any one user in it).
 *
 * Uses captureImmediate rather than capture() + a background flush —
 * Server Actions run in a short-lived serverless function that can be
 * frozen or torn down the instant the response is sent, which would
 * silently drop a normally-queued capture() call before it's actually
 * sent over the network. No-ops without NEXT_PUBLIC_POSTHOG_KEY. Never
 * throws — a missing/failed analytics call should never be the reason a
 * real user-facing action fails.
 */
export async function captureEvent(
  event: AnalyticsEvent,
  params: { userId: string; orgId: string; properties?: Record<string, unknown> },
): Promise<void> {
  const client = getPostHogClient()
  if (!client) return

  try {
    await client.captureImmediate({
      distinctId: params.userId,
      event,
      properties: { orgId: params.orgId, ...params.properties },
      groups: { organization: params.orgId },
    })
  } catch (err) {
    logger.error("Failed to capture analytics event", { event }, err)
  }
}
