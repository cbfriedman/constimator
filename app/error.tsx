"use client"

import { useEffect } from "react"
import Link from "next/link"
import * as Sentry from "@sentry/nextjs"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

// Next.js App Router error boundary — catches anything thrown by a page or
// its server actions below the root layout that nothing more specific
// already handles (found missing in a pre-launch audit: billing's
// Subscribe/Manage buttons wire straight to a server action with no
// try/catch, and lib/stripe.ts throws a clear "STRIPE_SECRET_KEY is not
// set" error when that's unconfigured — without this file, that surfaced
// as Next's generic unstyled crash screen instead of something a real
// user could act on).
export default function Error({
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
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
      <Alert variant="destructive" className="text-left">
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          This page hit an unexpected error. It&apos;s been reported —
          reload to try again, or reach out if it keeps happening.
        </AlertDescription>
      </Alert>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" render={<Link href="/dashboard" />}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  )
}
