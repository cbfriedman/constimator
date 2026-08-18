import "server-only"

import { randomUUID } from "node:crypto"

import { eq } from "drizzle-orm"

import { projects } from "@/db/schema"
import type { ScopedDb } from "@/lib/current-project"
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server"

// Shared by app/upload/actions.ts (the general project-documents uploader)
// and app/sub-quotes/actions.ts (step 41). Both need the identical
// org-ownership and storage-path checks before a file can be written, and
// those checks are the ones the step 30 security review turned up — having
// them in one place means a second upload path can't ship with a subtly
// weaker version of either.

export const DOCUMENTS_BUCKET = "project-documents"
export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024

// Also enforced at the Supabase Storage bucket level (db/storage-setup.sql)
// — checked in the Server Actions too so a rejected file gets a clean error
// message instead of a raw Storage API failure, without spending a
// signed-URL round trip.
export const PDF_MIME_TYPES = ["application/pdf"] as const

// Sub quotes accept images as well as PDFs, because that's how they actually
// arrive: a photo of a faxed page, taken at an angle on a phone, is a normal
// sub quote and a plan set never is. Spreadsheet and email-body quotes are
// real too but need a non-vision code path, so they're not here yet.
export const SUB_QUOTE_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const

/**
 * Confirms the project exists *and* belongs to the caller's org.
 *
 * Org isolation via getScopedDb() means this returns undefined for a project
 * id from a different org, rather than another org's project. Every upload
 * entry point calls this, including the "confirm" half: found during the step
 * 30 security review, confirmDocumentUpload is its own separately-callable
 * Server Action, and calling it directly with another org's project id —
 * skipping the request step entirely — inserted a document row referencing
 * that project via the foreign key. The row itself is still stamped with the
 * caller's own org, so nothing readable leaked, but it's a real cross-tenant
 * reference an attacker could trigger.
 */
export async function assertProjectInOrg(
  scopedDb: ScopedDb,
  projectId: string,
): Promise<void> {
  const project = await scopedDb.projects.findFirst(eq(projects.id, projectId))
  if (!project) {
    throw new Error("Project not found.")
  }
}

/**
 * Confirms a storage path sits under the caller's own org prefix.
 *
 * The most serious issue the step 30 security review turned up: without this,
 * an org could confirm an upload whose `path` points at ANOTHER org's real
 * storage object. Supabase Storage paths are predictable —
 * "{org_id}/{project_id}/{uuid}-{filename}" — so reusing a previously-seen
 * one is exactly the "reuse IDs" scenario that review was asked to test. The
 * resulting document row is stamped with the caller's own org (so nothing in
 * that table leaks by itself), but worker/src/download-document.ts downloads
 * whatever storage_path a queued job's document row says, using the
 * service-role key, which bypasses Storage's own RLS entirely. That
 * combination would let an attacker get the worker to download and
 * AI-extract another org's document and read the result back through their
 * own account. Requiring the org prefix closes this at the one point that
 * actually creates the row, rather than trying to re-derive trust in the
 * worker (which has no session for RLS to check against anyway).
 */
export function assertPathInOrg(scopedDb: ScopedDb, path: string): void {
  if (!path.startsWith(`${scopedDb.orgId}/`)) {
    throw new Error("Storage path does not belong to your organization.")
  }
}

/**
 * Reserves a storage path under the caller's org and returns a signed URL the
 * browser can PUT the file to directly, so a 500 MB scan never travels
 * through a Vercel function.
 */
export async function createSignedDocumentUpload(
  scopedDb: ScopedDb,
  projectId: string,
  fileName: string,
): Promise<{ signedUrl: string; path: string }> {
  await assertProjectInOrg(scopedDb, projectId)

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const path = `${scopedDb.orgId}/${projectId}/${randomUUID()}-${safeName}`

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUploadUrl(path)

  if (error || !data) {
    throw new Error(error?.message ?? "Could not prepare upload.")
  }

  return { signedUrl: data.signedUrl, path }
}
