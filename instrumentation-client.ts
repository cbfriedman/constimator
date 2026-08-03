// Next.js's special filename for client-side instrumentation — loaded
// automatically before the app renders, no explicit import needed anywhere.
// Separate DSN var from the server configs: this one ships in the browser
// bundle, so it has to be NEXT_PUBLIC_-prefixed (same DSN value is fine,
// Sentry DSNs aren't secret — they're a write-only ingest endpoint).
import * as Sentry from "@sentry/nextjs"
import posthog from "posthog-js"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
})

// Step 34 — product analytics. posthog.init() itself no-ops without a real
// key (it just never sends anything), so this is safe to run unconditionally
// rather than gating on process.env like every server-side integration in
// this app does — there's no error to throw here, just nothing to do.
if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    // Next.js App Router navigates via the History API, not full page
    // loads — PostHog's default pageview capture (tied to the browser's
    // load event) would only ever fire once. "history_change" tracks
    // pushState/replaceState/popstate instead, which is what App Router
    // navigation actually does.
    capture_pageview: "history_change",
    person_profiles: "identified_only",
  })
}

