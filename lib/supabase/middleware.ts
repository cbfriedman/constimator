import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_PATHS = new Set(["/", "/demo-guide", "/sign-in", "/sign-up"])

export async function updateSession(request: NextRequest) {
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

  const { pathname } = request.nextUrl
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
