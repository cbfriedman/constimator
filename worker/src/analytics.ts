import { PostHog } from "posthog-node"

import { logger } from "./logger.js"

// Step 34. Mirrors lib/analytics.ts in the main app — duplicated rather
// than imported, same isolation reasoning as every other worker/src file
// (see worker/README.md). No per-user session here (the worker has no
// concept of "which user" beyond the org that queued the job), so events
// are attributed to the org itself rather than a specific person — see
// captureTakeoffCompleted below.
let instance: PostHog | null = null

function getPostHogClient(): PostHog | null {
  const apiKey = process.env.POSTHOG_KEY
  if (!apiKey) return null
  if (!instance) {
    instance = new PostHog(apiKey, {
      host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
    })
  }
  return instance
}

export async function captureTakeoffCompleted(
  orgId: string,
  properties: Record<string, unknown>,
): Promise<void> {
  const client = getPostHogClient()
  if (!client) return

  try {
    // distinctId is the org, not a user — same PostHog Group ("organization")
    // the main app's events use, so this shows up correctly grouped
    // alongside project_created/document_uploaded/reconciliation_computed
    // even without a per-user identity to attach it to.
    await client.captureImmediate({
      distinctId: orgId,
      event: "takeoff_completed",
      properties,
      groups: { organization: orgId },
    })
  } catch (err) {
    logger.error("Failed to capture analytics event", { event: "takeoff_completed" }, err)
  }
}
