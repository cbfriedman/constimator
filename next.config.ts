import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const nextConfig: NextConfig = {}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  telemetry: false,
  // No SENTRY_AUTH_TOKEN in this environment — source map upload needs
  // one; without it the plugin skips that step rather than failing the
  // build (verified locally). Error reporting itself doesn't need it.
})
