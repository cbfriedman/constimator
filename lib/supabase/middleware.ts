import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// /accept-invite (step 32): landing point for Supabase's invite email
// link. The server has no session cookie yet on the very first request
// here — the invite link carries the session as a URL hash fragment
// (Supabase doesn't support PKCE for invites), which only the browser
// can process, after this page has already loaded. Without this, the
// redirect-to-/sign-in below would fire before the client ever gets a
// chance to establish the session. See app/accept-invite/page.tsx.
const PUBLIC_PATHS = new Set(["/", "/demo-guide", "/sign-in", "/sign-up", "/accept-invite"])

// Routes with their own auth (a token or a cryptographic signature, not a
// Supabase session) — an external caller (an uptime monitor, Stripe's
// webhook delivery) has no session cookie and can't complete a sign-in
// redirect, so these need to bypass this middleware entirely rather than
// just being added to PUBLIC_PATHS (which would still run the Supabase
// auth revalidation below for every call, for no reason).
// /api/health: found during the step 30 security review — without this it
// was unreachable by anything unauthenticated, silently defeating the
// uptime check it exists for.
// /api/webhooks/stripe: same failure mode would apply — Stripe's servers
// have no session either, and the route verifies its own signature.
const BYPASS_PATHS = new Set(["/api/health", "/api/webhooks/stripe"])

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (BYPASS_PATHS.has(pathname)) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Do not run any logic between createServerClient and getUser() — it
  // revalidates the session token and must run on every request.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublicPath = PUBLIC_PATHS.has(pathname) || pathname.startsWith("/auth")

  if (!user && !isPublicPath) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/sign-in"
    redirectUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && (pathname === "/sign-in" || pathname === "/sign-up")) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/dashboard"
    redirectUrl.search = ""
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}
