export type TakeoffDocument = {
  storage_bucket: string
  storage_path: string
  file_name: string
}

/**
 * Placeholder for the real takeoff extraction module (step 16), which is
 * blocked pending accuracy validation from step 15's standalone script
 * (scripts/takeoff-validation/) — see that conversation for status.
 *
 * Every job fails through this on purpose, with a clear, specific message,
 * so failures are loud and traceable in takeoff_job.error rather than the
 * pipeline silently hanging or faking a result.
 *
 * Once lib/takeoff/extract.ts exists in the main app: download the PDF from
 * Supabase Storage using storage_bucket/storage_path (the worker will need
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for that — it has no per-user
 * session, same reasoning as the DB connection in db.ts), rasterize,
 * extract, and return the result shape process-job.ts stores in
 * takeoff_job.result.
 */
export async function runTakeoffExtraction(
  document: TakeoffDocument,
): Promise<never> {
  throw new Error(
    `Takeoff extraction not implemented yet (step 16 blocked on accuracy validation) — would have processed "${document.file_name}"`,
  )
}
