import "server-only"

import * as Sentry from "@sentry/nextjs"

// Step 29 — structured server-side logging. Single-line JSON to stdout
// (level, message, timestamp, plus arbitrary context) instead of the
// free-text console.error(...) calls scattered through the server actions
// — Vercel/Railway both capture stdout natively, and JSON lines are
// greppable/queryable without needing a separate log-shipping setup yet.
//
// logger.error also reports to Sentry when it's configured (no-ops
// otherwise, same as sentry.server.config.ts) — one call site for both
// concerns instead of every call site remembering to do both.
type LogContext = Record<string, unknown>

function emit(level: "info" | "warn" | "error", message: string, context?: LogContext) {
  const line = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  }
  const serialized = JSON.stringify(line)
  if (level === "error") console.error(serialized)
  else if (level === "warn") console.warn(serialized)
  else console.log(serialized)
}

export const logger = {
  info(message: string, context?: LogContext) {
    emit("info", message, context)
  },
  warn(message: string, context?: LogContext) {
    emit("warn", message, context)
  },
  /**
   * @param error Pass the actual caught error when there is one — Sentry
   * groups/deduplicates on the exception's type and stack, which a bare
   * message can't give it. Omit only for a genuine "nothing threw, but this
   * state is wrong" case.
   */
  error(message: string, context?: LogContext, error?: unknown) {
    emit("error", message, context)
    if (error !== undefined) {
      Sentry.captureException(error, { extra: context })
    } else {
      Sentry.captureMessage(message, { level: "error", extra: context })
    }
  },
}
