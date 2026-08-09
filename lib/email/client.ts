import "server-only"

import { Resend } from "resend"

import { logger } from "@/lib/logger"

// Same "degrade to a loud warning, don't block the caller" pattern as the
// Upstash rate limiter (lib/ai-limits.ts) and Sentry (lib/logger.ts) — an
// unconfigured Resend key shouldn't stop the spend-cap check itself from
// working, it should just mean the admin doesn't get emailed about it.
let client: Resend | null | undefined

export function getResendClient(): Resend | null {
  if (client !== undefined) return client

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    logger.warn("RESEND_API_KEY not set — transactional email is disabled.")
    client = null
    return client
  }

  client = new Resend(apiKey)
  return client
}

// From address for every transactional email this app sends. Resend
// requires the domain to be verified in their dashboard before this will
// actually deliver — see .env.example.
export const EMAIL_FROM = process.env.EMAIL_FROM || "Constimator <onboarding@resend.dev>"
