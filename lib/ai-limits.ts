import "server-only"

import { gte } from "drizzle-orm"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

import { aiUsageEvents } from "@/db/schema"
import type { getScopedDb } from "@/lib/db/scoped"
import { logger } from "@/lib/logger"

type ScopedDb = Awaited<ReturnType<typeof getScopedDb>>

// Published Anthropic list prices, USD per million tokens. Duplicated in
// worker/src/ai-limits.ts, which is where it's actually applied (the worker
// is the one making the paid call) — the worker can't import from this
// app's lib/, see worker/README.md. Keep the two tables in sync.
//
// This was a single hardcoded $3/$15 pair applied to every call regardless
// of model: right for Claude Sonnet 5, wrong for the Claude Opus 5 that
// worker/src/extract-quote-conditions.ts uses, which bills $5/$25. Since
// all three extractors record through the same code path, the spend cap
// undercounted quote extraction by about 40%.
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

// An unrecognised model id is priced at the highest rate this table knows.
// The cap exists to bound spend, and assuming an unknown model is cheap is
// exactly how a cap stops protecting anything.
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

// Same window/count and Redis key prefix as worker/src/ai-limits.ts — this
// is the queue-time check (app), the worker repeats it call-time
// (authoritative, since that's where the money is actually spent). Both
// draw from the same Upstash counter per org, so they coordinate rather
// than each allowing their own independent 5-per-10-minutes.
const RATE_LIMIT_PREFIX = "constimator:takeoff-ratelimit"
const RATE_LIMIT_REQUESTS = 5
const RATE_LIMIT_WINDOW = "10 m"

let limiter: Ratelimit | null | undefined

function getRateLimiter(): Ratelimit | null {
  if (limiter !== undefined) return limiter

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    // Rate limiting is an abuse-prevention layer, not the thing that
    // actually bounds spend (the monthly cap does that, and only needs the
    // database) — so a missing Upstash config degrades to "no rate limit"
    // with a loud warning, rather than blocking every takeoff request.
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

function startOfCurrentMonthUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

// scopedDb is already bound to one org (getScopedDb()), so every query here
// is inherently that org's data only — no separate orgId param needed on
// this side (contrast worker/src/ai-limits.ts, which has no per-request
// scoped connection and takes orgId explicitly).
export async function getOrgMonthlySpendUsd(scopedDb: ScopedDb): Promise<number> {
  const rows = await scopedDb.aiUsageEvents.findMany(
    gte(aiUsageEvents.createdAt, startOfCurrentMonthUtc()),
  )
  return rows.reduce((total, row) => total + Number(row.estimatedCostUsd), 0)
}

export type SpendCapStatus = { overCap: boolean; spentUsd: number; capUsd: number }

export async function checkSpendCap(scopedDb: ScopedDb): Promise<SpendCapStatus> {
  const org = await scopedDb.org.get()
  const capUsd = org ? Number(org.aiMonthlySpendCapUsd) : 0
  const spentUsd = await getOrgMonthlySpendUsd(scopedDb)
  return { overCap: spentUsd >= capUsd, spentUsd, capUsd }
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
