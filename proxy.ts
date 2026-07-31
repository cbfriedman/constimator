import { NextResponse, type NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/middleware"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (process.env.MAINTENANCE_MODE === "true" && pathname !== "/maintenance") {
    const maintenanceUrl = request.nextUrl.clone()
    maintenanceUrl.pathname = "/maintenance"
    return NextResponse.rewrite(maintenanceUrl)
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
