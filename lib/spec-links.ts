/**
 * A spec link's URL (lib/cost-engine/types.ts's ExtractedSpecLink) is a
 * string an AI read off a PDF and we then render as a clickable link. That
 * makes it untrusted input on a path where the usual React escaping does
 * nothing for us: JSX escapes an href's *text*, not its scheme, so a
 * `javascript:` value in an <a href> still executes on click. Every spec URL
 * goes through this before it reaches an href.
 *
 * The scheme allowlist is the security part. The rest is transcription
 * cleanup, because a URL printed mid-sentence in a spec book arrives with the
 * sentence's punctuation attached and wrapped in whatever brackets the
 * agency's template uses.
 *
 * Returns null for anything that isn't a plain web address — the caller shows
 * the label as text rather than as a link.
 */
export function safeSpecUrl(raw: string): string | null {
  let candidate = raw.trim()
  if (!candidate) return null

  // <https://example.gov/dbe> and (https://example.gov/dbe) are both common in
  // agency templates, and a URL at the end of a sentence keeps the full stop.
  candidate = candidate.replace(/^[<([]+/, "").replace(/[>)\].,;:]+$/, "")
  if (!candidate) return null

  // A bare "www.dot.ca.gov/dbe" is how specs usually print an address. Only
  // add a scheme when there is none — testing for a scheme first is what
  // keeps "javascript:..." from being rewritten into something that parses as
  // https and passes the check below.
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(candidate)
  const withScheme = hasScheme ? candidate : `https://${candidate}`

  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return null
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null
  // Rules out "https://localhost"-shaped leftovers and, more to the point,
  // fragments of prose that happened to survive the parse.
  if (!url.hostname.includes(".")) return null

  return url.toString()
}
