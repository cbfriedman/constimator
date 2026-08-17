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

// A thrown value is not necessarily an Error, and `cause` is where the
// useful part of a driver/network failure usually lives (postgres.js and
// undici both wrap the underlying socket error there), so it's followed one
// level down rather than dropped.
function describeError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { value: String(error) }
  const described: Record<string, unknown> = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  }
  const code = (error as { code?: unknown }).code
  if (code !== undefined) described.code = code
  if (error.cause instanceof Error) {
    described.cause = { name: error.cause.name, message: error.cause.message }
  }
  return described
}

export const logger = {
  info(message: string, context?: LogContext) {
    emit("info", message, context)
  },
  warn(message: string, context?: LogContext) {
    emit("warn", message, context)
  },
  error(message: string, context?: LogContext, error?: unknown) {
    // The error itself goes in the log line, not just to Sentry. Found the
    // hard way: with no SENTRY_DSN set (every local run, and any deploy
    // where it's unset), a repeating "Poll cycle failed" carried no name,
    // message, or stack anywhere — stdout is the only channel that's always
    // there, so the detail has to be on it. Sentry still gets the real
    // exception object below, with the stack it needs to group on.
    emit("error", message, {
      ...context,
      ...(error === undefined ? {} : { error: describeError(error) }),
    })
    if (error !== undefined) {
      Sentry.captureException(error, { extra: context })
    } else {
      Sentry.captureMessage(message, { level: "error", extra: context })
    }
  },
}
