import "server-only"

import { headers } from "next/headers"

/**
 * Recovers the app's own origin for building absolute redirect URLs
 * (Stripe Checkout/billing portal return_urls, Supabase invite email
 * links) — Server Actions don't get the request object the way a route
 * handler does, so headers() is the sanctioned way to read it back.
 * Falls back to http:// only for localhost; everywhere the app is
 * actually served, redirects go back over the scheme it's served on.
 */
export async function getAppOrigin(): Promise<string> {
  const headerList = await headers()
  const host = headerList.get("host") ?? "localhost:3000"
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https"
  return `${protocol}://${host}`
}
