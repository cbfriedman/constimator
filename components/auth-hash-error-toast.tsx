"use client"

import { useEffect } from "react"
import { toast } from "sonner"

// Supabase's auth verify endpoint (password reset, email confirmation,
// invite links) always redirects an expired/invalid/already-used link to
// the project's Site URL root — never to the flow's own redirectTo — with
// the error appended as a URL hash fragment (#error=...&error_code=...).
// Since the hash never reaches the server, whatever page happens to be at
// the Site URL root has to notice and handle it client-side, or the user
// just sees a blank page with a raw error string in the address bar.
const FRIENDLY_MESSAGES: Record<string, string> = {
  otp_expired:
    "That link has expired or was already used. Request a new one from the sign-in page.",
  access_denied: "That link is no longer valid. Request a new one and try again.",
}

export function AuthHashErrorToast() {
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.includes("error=")) return

    const params = new URLSearchParams(hash.slice(1))
    const errorCode = params.get("error_code")
    const description = params.get("error_description")

    toast.error(
      (errorCode && FRIENDLY_MESSAGES[errorCode]) ||
        (description
          ? description.replace(/\+/g, " ")
          : "That link is no longer valid. Please try again."),
    )

    // Clear the hash so a refresh (or sharing the URL) doesn't re-trigger
    // the same toast or leave the raw error string in the address bar.
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    )
  }, [])

  return null
}
