/**
 * Builds the object path portion of the Storage URL.
 *
 * This is the load-bearing half of the fix for the storage-path traversal
 * issue, and it is deliberately a *different* mechanism from the app-side
 * shape check in lib/validation.ts's parseStoragePath. The original
 * "defense in depth" was the same `storage_path.startsWith(org_id + "/")`
 * test copied into both the app and this worker, which meant one missing
 * `..` check disabled both copies at once — not two layers, one layer
 * written twice.
 *
 * The attack this blocks: a document row whose storage_path is
 * `{attackerOrg}/../{victimOrg}/{project}/{uuid}-plans.pdf`. Interpolated
 * raw into a URL, the WHATWG parser resolves the `..` dot-segment *before*
 * the request goes out, so Supabase receives the victim's real path — and
 * because this function authenticates with the service-role key, Storage's
 * own RLS never gets a say.
 *
 * Two independent guards:
 *   1. Dot segments and empty segments are refused outright. encodeURIComponent
 *      does not escape "." at all, so encoding alone would not save us here.
 *   2. Every segment is percent-encoded, which turns a literal "%" into "%25".
 *      That stops `%2e%2e` (an encoded "..") from being decoded into a dot
 *      segment further down the line, and incidentally makes odd-but-legal
 *      file names survive the round trip instead of corrupting the URL.
 * Slashes are re-joined afterwards so genuine path structure is preserved.
 */
function encodeStorageObjectPath(storagePath: string): string {
  const segments = storagePath.split("/")

  for (const segment of segments) {
    if (segment.length === 0) {
      throw new Error(`Refusing to download "${storagePath}": empty path segment.`)
    }
    if (segment === "." || segment === "..") {
      throw new Error(`Refusing to download "${storagePath}": relative path segment.`)
    }
  }

  return segments.map((segment) => encodeURIComponent(segment)).join("/")
}

// Downloads a document's PDF bytes from Supabase Storage. This worker has
// no per-user session (same reasoning as db.ts's DATABASE_URL choice), so
// it authenticates with the service-role key against Storage's REST API
// directly rather than pulling in the full @supabase/supabase-js client for
// one GET request.
export async function downloadDocument(
  storageBucket: string,
  storagePath: string,
): Promise<Buffer> {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — see .env.example")
  }

  const url = `${supabaseUrl}/storage/v1/object/${encodeURIComponent(storageBucket)}/${encodeStorageObjectPath(storagePath)}`
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to download ${storageBucket}/${storagePath}: ${response.status} ${response.statusText}`,
    )
  }

  return Buffer.from(await response.arrayBuffer())
}
