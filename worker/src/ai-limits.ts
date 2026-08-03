import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

import { sql } from "./db.js"
import { logger } from "./logger.js"

// Step 25. Mirrors lib/ai-limits.ts in the main app — duplicated rather
// than imported (this worker doesn't have access to that app's lib/, see
// worker/README.md for why it's isolated). Keep both copies' pricing,
// rate-limit window, and Redis key prefix in sync by hand.

// Placeholder pricing — verify against Anthropic's published rate for
// TAKEOFF_MODEL (see extract.ts) before relying on this for real billing
// decisions; it's an estimate used to enforce the spend cap, not an
// invoice.
const INPUT_COST_PER_MILLION_TOKENS_USD = 3
const OUTPUT_COST_PER_MILLION_TOKENS_USD = 15

export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION_TOKENS_USD +
    (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION_TOKENS_USD
  )
}

// Same prefix/window as lib/ai-limits.ts — both sides check the same
// Upstash counter per org, so the app's queue-time check and this
// call-time check coordinate instead of each allowing their own
// independent 5-per-10-minutes.
const RATE_LIMIT_PREFIX = "constimator:takeoff-ratelimit"
const RATE_LIMIT_REQUESTS = 5
const RATE_LIMIT_WINDOW = "10 m"

let limiter: Ratelimit | null | undefined

function getRateLimiter(): Ratelimit | null {
  if (limiter !== undefined) return limiter

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    logger.warn("UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set — takeoff rate limiting is disabled.")
    limiter = null
    return limiter
  }

  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW),
    prefix: RATE_LIMIT_PREFIX,
  })
  return limiter
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number }

export async function checkTakeoffRateLimit(orgId: string): Promise<RateLimitResult> {
  const rateLimiter = getRateLimiter()
  if (!rateLimiter) return { allowed: true }

  const result = await rateLimiter.limit(orgId)
  if (result.success) return { allowed: true }

  return {
    allowed: false,
    retryAfterSeconds: Math.max(0, Math.ceil((result.reset - Date.now()) / 1000)),
  }
}

export type SpendCapStatus = { overCap: boolean; spentUsd: number; capUsd: number }

// This is the authoritative check — it runs immediately before the paid
// Claude call, unlike the app's queue-time pre-check of the same cap.
export async function checkSpendCap(orgId: string): Promise<SpendCapStatus> {
  const [org] = await sql`
    select ai_monthly_spend_cap_usd from org where id = ${orgId}
  `
  const capUsd = org ? Number(org.ai_monthly_spend_cap_usd) : 0

  const [row] = await sql`
    select coalesce(sum(estimated_cost_usd), 0) as spent
    from ai_usage_event
    where org_id = ${orgId}
      and created_at >= date_trunc('month', now() at time zone 'utc')
  `
  const spentUsd = Number(row?.spent ?? 0)

  return { overCap: spentUsd >= capUsd, spentUsd, capUsd }
}

export async function recordAiUsage(
  orgId: string,
  kind: string,
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  const estimatedCostUsd = estimateCostUsd(inputTokens, outputTokens)
  await sql`
    insert into ai_usage_event (org_id, kind, input_tokens, output_tokens, estimated_cost_usd)
    values (${orgId}, ${kind}, ${inputTokens}, ${outputTokens}, ${estimatedCostUsd})
  `
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
