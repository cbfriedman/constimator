// Edge runtime (proxy.ts / middleware) has its own JS context separate from
// the Node.js server — this is its own Sentry.init, per Next.js's
// instrumentation hook convention.
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
})
