"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

// Only fires for an error thrown by the root layout itself (rare — most
// real errors are caught by app/error.tsx instead). Has to render its own
// <html>/<body>: this replaces the root layout entirely, so none of its
// providers/fonts are available here.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ color: "#666", maxWidth: "28rem" }}>
            Constimator hit an unexpected error loading this page. It&apos;s
            been reported — try reloading.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "0.375rem",
              background: "#ea580c",
              color: "white",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
