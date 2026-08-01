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

  const url = `${supabaseUrl}/storage/v1/object/${storageBucket}/${storagePath}`
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
