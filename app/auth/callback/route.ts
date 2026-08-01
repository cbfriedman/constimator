import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const redirectTo = searchParams.get("redirect") ?? "/dashboard"

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
