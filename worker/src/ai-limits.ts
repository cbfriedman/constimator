import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

import { sql } from "./db.js"
import { logger } from "./logger.js"

// Step 25. Mirrors lib/ai-limits.ts in the main app — duplicated rather
// than imported (this worker doesn't have access to that app's lib/, see
// worker/README.md for why it's isolated). Keep both copies' pricing,
// rate-limit window, and Redis key prefix in sync by hand.

// Published Anthropic list prices, USD per million tokens. This used to be
// a single hardcoded $3/$15 pair applied to every call regardless of model
// — correct for Claude Sonnet 5 (extract.ts, extract-bid-form.ts) but not
// for Claude Opus 5, which extract-quote-conditions.ts uses and which bills
// $5/$25. Every extractor reports through recordAiUsage below, so an org
// capped at $50 could run roughly $83 of real spend on quote-heavy work.
//
// Still an estimate rather than an invoice: it ignores prompt-cache
// discounts (which only make real spend lower, never higher) and any
// promotional rate. It exists to bound spend, so every ambiguity is
// resolved in the direction of over-counting.
type ModelPricing = { inputPerMillionUsd: number; outputPerMillionUsd: number }

const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-fable-5": { inputPerMillionUsd: 10, outputPerMillionUsd: 50 },
  "claude-opus-5": { inputPerMillionUsd: 5, outputPerMillionUsd: 25 },
  "claude-opus-4-8": { inputPerMillionUsd: 5, outputPerMillionUsd: 25 },
  "claude-opus-4-7": { inputPerMillionUsd: 5, outputPerMillionUsd: 25 },
  "claude-opus-4-6": { inputPerMillionUsd: 5, outputPerMillionUsd: 25 },
  "claude-sonnet-5": { inputPerMillionUsd: 3, outputPerMillionUsd: 15 },
  "claude-sonnet-4-6": { inputPerMillionUsd: 3, outputPerMillionUsd: 15 },
  "claude-haiku-4-5": { inputPerMillionUsd: 1, outputPerMillionUsd: 5 },
}

// An unrecognised model id means someone set TAKEOFF_MODEL/QUOTE_MODEL to
// something this table doesn't know — most likely a newer model. Charging
// it at the highest rate we know about keeps the cap protective, since the
// alternative (assume it's cheap) is how a cap silently stops working.
const UNKNOWN_MODEL_PRICING: ModelPricing = { inputPerMillionUsd: 10, outputPerMillionUsd: 50 }

export function pricingFor(model: string): ModelPricing {
  return MODEL_PRICING[model] ?? UNKNOWN_MODEL_PRICING
}

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = pricingFor(model)
  return (
    (inputTokens / 1_000_000) * pricing.inputPerMillionUsd +
    (outputTokens / 1_000_000) * pricing.outputPerMillionUsd
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
  model: string,
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  const estimatedCostUsd = estimateCostUsd(model, inputTokens, outputTokens)
  if (!MODEL_PRICING[model]) {
    logger.warn("Unknown model priced at the highest known rate", { model, kind, orgId })
  }
  await sql`
    insert into ai_usage_event (org_id, kind, input_tokens, output_tokens, estimated_cost_usd)
    values (${orgId}, ${kind}, ${inputTokens}, ${outputTokens}, ${estimatedCostUsd})
  `
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
