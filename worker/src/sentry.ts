// Step 29. Imported first thing in index.ts so Sentry is initialized
// before anything else in the process can throw. No-ops without a DSN,
// same pattern as every other credential-gated integration in this app
// (see sentry.server.config.ts in the main app for the Next.js side).
import * as Sentry from "@sentry/node"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
})

export { Sentry }
