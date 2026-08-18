-- One-time Supabase Storage setup for uploaded bid documents. Run this in
-- the Supabase SQL editor (or via `supabase db execute`) after the migration
-- in db/migrations/ has been applied — it depends on public.current_org_id()
-- from that migration. Not managed by Drizzle: storage.buckets/storage.objects
-- are Supabase-owned tables outside our schema.ts.

-- 500 MB cap and a MIME allowlist — enforced by Supabase Storage itself at
-- the API level, not just in application code (defense in depth: the client
-- and the upload-request Server Action both also check this before ever
-- asking for a signed URL, but a client can be bypassed; this can't).
--
-- Step 41 widened this beyond PDF. Project documents (plans, specs, bid
-- forms) are still PDF-only in application code — see PDF_MIME_TYPES in
-- lib/document-upload.ts — but sub quotes arrive as phone photos of faxed
-- pages at least as often as PDFs, so JPEG and PNG have to be accepted by
-- the bucket. The bucket can only express one allowlist for all of its
-- objects, so the narrower per-kind rules stay in the Server Actions; this
-- is the outer bound, not the whole policy.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-documents',
  'project-documents',
  false,
  524288000,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Objects are stored at "{org_id}/{project_id}/{uuid}-{filename}" (see
-- app/upload/actions.ts). storage.foldername(name) splits that into path
-- segments excluding the filename, so segment [1] is the org id — same
-- org-isolation pattern as every table's RLS policy from step 8, reusing
-- the same current_org_id() function.
create policy "project_documents_org_isolation"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'project-documents'
  and (storage.foldername(name))[1]::uuid = public.current_org_id()
)
with check (
  bucket_id = 'project-documents'
  and (storage.foldername(name))[1]::uuid = public.current_org_id()
);
