"use client"

import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSubmitted(true)
  }

  return (
    <div className="flex min-h-svh flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Set up a Constimator account for your company.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <Alert>
              <AlertDescription>
                Check {email} for a confirmation link to finish creating your
                account.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </Field>
                <Field>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Creating account…" : "Sign up"}
                  </Button>
                </Field>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    href="/sign-in"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
