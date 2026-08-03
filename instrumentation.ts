// Next.js's instrumentation hook — register() runs once per server
// instance start, before any request is handled. This is what actually
// loads the sentry.server.config.ts / sentry.edge.config.ts Sentry.init
// calls; instrumentation-client.ts (a separate special filename) handles
// the browser side and needs no explicit wiring here.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

export const onRequestError = async (
  ...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>
) => {
  const { captureRequestError } = await import("@sentry/nextjs")
  captureRequestError(...args)
}
