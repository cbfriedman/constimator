import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_PATHS = new Set(["/", "/demo-guide", "/sign-in", "/sign-up"])

// Routes with their own auth (a token, not a Supabase session) — an
// external uptime monitor hitting /api/health has no session cookie and
// can't complete a sign-in redirect, so it needs to bypass this middleware
// entirely rather than just being added to PUBLIC_PATHS (which would still
// run the Supabase auth revalidation below for every ping, for no reason).
// Found during the step 30 security review: without this, /api/health was
// unreachable by anything unauthenticated — it just 307'd to /sign-in,
// silently defeating the uptime check it exists for.
const BYPASS_PATHS = new Set(["/api/health"])

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
