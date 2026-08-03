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

// Landing point for Supabase's invite email link (see
// app/team/actions.ts's inviteTeammateAction). Unlike the OAuth/magic-link
// flow /auth/callback handles, Supabase explicitly doesn't support PKCE
// for invites — the browser that sends the invite and the one that
// accepts it are usually different, which breaks PKCE's security model.
// So the invite link carries the session as a URL hash fragment instead
// of a ?code= param, and fragments never reach the server — this has to
// be a client page that lets the browser Supabase client's own
// detectSessionInUrl pick it up, not a route handler doing a code
// exchange. Also added to lib/supabase/middleware.ts's PUBLIC_PATHS: the
// server has no session cookie yet on the very first request here (the
// hash hasn't been processed client-side yet), so the auth middleware
// would otherwise redirect this away before the browser gets a chance.
export default function AcceptInvitePage() {
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
          <CardTitle className="text-xl">Welcome to Constimator</CardTitle>
          <CardDescription>
            {checkingSession
              ? "Setting up your account…"
              : hasSession
                ? "Set a password to finish setting up your account."
                : "This invite link is invalid or has expired."}
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
                  <FieldLabel htmlFor="password">Password</FieldLabel>
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
                    {loading ? "Saving…" : "Continue"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>
                Ask whoever invited you to send a new invite, or{" "}
                <Link href="/sign-in" className="underline underline-offset-4">
                  sign in
                </Link>{" "}
                if you already have an account.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
