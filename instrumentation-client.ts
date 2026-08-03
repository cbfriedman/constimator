// Next.js's special filename for client-side instrumentation — loaded
// automatically before the app renders, no explicit import needed anywhere.
// Separate DSN var from the server configs: this one ships in the browser
// bundle, so it has to be NEXT_PUBLIC_-prefixed (same DSN value is fine,
// Sentry DSNs aren't secret — they're a write-only ingest endpoint).
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
})
