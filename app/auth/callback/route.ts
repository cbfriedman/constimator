import { NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

// The redirect target is attacker-controlled (it's a query param on a
// public callback URL) and gets concatenated straight into a redirect
// response below — an unvalidated value here is a classic open-redirect
// vector (?redirect=https://evil.com, or protocol-relative //evil.com).
// Only same-origin relative paths are accepted; anything else falls back
// to /dashboard rather than erroring — a bad/malicious redirect param
// shouldn't break a real user's sign-in, it should just be ignored.
const safeRedirectPathSchema = z.string().regex(/^\/(?!\/|\\)/, "must be a relative path")

function resolveRedirect(rawRedirect: string | null): string {
  if (rawRedirect === null) return "/dashboard"
  const result = safeRedirectPathSchema.safeParse(rawRedirect)
  return result.success ? result.data : "/dashboard"
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const redirectTo = resolveRedirect(searchParams.get("redirect"))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(error.message)}`,
    )
  }

  // The provider itself can redirect here with an error and no code at all
  // (e.g. the user cancels the Google consent screen).
  const errorDescription = searchParams.get("error_description")
  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(errorDescription)}`,
    )
  }

  return NextResponse.redirect(`${origin}/sign-in`)
}
