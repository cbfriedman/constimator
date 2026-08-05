"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { PasswordInput } from "@/components/ui/password-input"
import { createClient } from "@/lib/supabase/client"

// Landing point for Supabase's "reset password" email link (see
// app/forgot-password/page.tsx). Same shape as app/accept-invite/page.tsx
// and the same reason: Supabase's recovery link carries the session as a
// URL hash fragment, which never reaches the server, so this has to be a
// client page that lets the browser Supabase client's own
// detectSessionInUrl pick it up rather than a route handler doing a code
// exchange. Also added to lib/supabase/middleware.ts's PUBLIC_PATHS for
// the same reason: no session cookie exists yet on the very first
// server-rendered request, before the browser has processed the hash.
export default function ResetPasswordPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(!!data.user)
      setCheckingSession(false)
    })
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push("/dashboard")
  }

  return (
    <div className="flex min-h-svh flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Set a new password</CardTitle>
          <CardDescription>
            {checkingSession
              ? "Verifying your link…"
              : hasSession
                ? "Choose a new password for your account."
                : "This reset link is invalid or has expired."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {checkingSession ? null : hasSession ? (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Field>
                  <FieldLabel htmlFor="password">New password</FieldLabel>
                  <PasswordInput
                    id="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </Field>
                <Field>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Saving…" : "Update password"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>
                Request a new link from{" "}
                <Link
                  href="/forgot-password"
                  className="underline underline-offset-4"
                >
                  the reset password page
                </Link>
                , or{" "}
                <Link href="/sign-in" className="underline underline-offset-4">
                  sign in
                </Link>{" "}
                if you remember your password.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
