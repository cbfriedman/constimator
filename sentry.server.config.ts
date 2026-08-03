// Runs once when the Node.js server starts — imported from instrumentation.ts
// per Next.js's own instrumentation hook, not the older sentry.server.config
// auto-loading convention (deprecated for App Router).
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // No-ops cleanly without a DSN (step 25/16-style graceful degrade — every
  // other credential-gated integration in this app follows this same
  // pattern) rather than crashing server startup over a missing env var.
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Conservative default — this is a low-traffic pilot-stage app, not a
  // high-volume product where 100% tracing would be expensive. Revisit once
  // there's real traffic to reason about.
  tracesSampleRate: 0.1,
})
