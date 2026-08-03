import { Sentry } from "./sentry.js"

// Mirrors lib/logger.ts in the main app (duplicated for the same isolation
// reason as worker/src/types.ts etc. — this worker doesn't share the main
// app's lib/). Single-line JSON to stdout, plus a Sentry report on .error
// when it's configured.
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
  error(message: string, context?: LogContext, error?: unknown) {
    emit("error", message, context)
    if (error !== undefined) {
      Sentry.captureException(error, { extra: context })
    } else {
      Sentry.captureMessage(message, { level: "error", extra: context })
    }
  },
}
