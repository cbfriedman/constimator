import { z } from "zod"

// Thrown by parseInput on a failed schema check. Kept as a distinct class
// (rather than a plain Error) so a validation failure is identifiable if a
// caller ever wants to handle it differently from a DB/auth error — e.g.
// the auth callback route below catches this specifically to return a 400
// instead of letting it fall through as an unhandled 500.
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ValidationError"
  }
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(value)"}: ${issue.message}`)
    .join("; ")
}

/**
 * Parses `input` against `schema`, throwing a ValidationError with a clear,
 * per-field message on failure instead of letting malformed data reach a
 * Drizzle query (where it would surface as an opaque Postgres error) or get
 * silently coerced into something wrong.
 */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new ValidationError(formatZodError(result.error))
  }
  return result.data
}

// Every id in this app (project, document, bid, estimate line, ...) is a
// Postgres uuid primary key — reused everywhere an action takes a bare id.
export const uuidSchema = z.string().uuid("must be a valid id")

// Supabase Storage object keys for this app are generated in exactly one
// place — createSignedDocumentUpload in lib/document-upload.ts — and always
// have the shape `{orgId}/{projectId}/{uuid}-{safeName}`. So the right check
// is an allowlist of that shape, not a denylist of the tricks we happen to
// have thought of.
//
// This exists because `path` used to be `z.string().trim().min(1)` on all
// three confirm-upload actions, and the only other guard was a
// `path.startsWith(`${orgId}/`)` test. A path of
// `{myOrg}/../{victimOrg}/{project}/{uuid}-plans.pdf` passes both: it really
// does start with the caller's own org id, and nothing anywhere rejected the
// `..` segment. The worker then downloads whatever the document row says
// using the service-role key, which bypasses Storage RLS — so that string
// was enough to get another org's plan set fetched and AI-extracted into a
// job row the attacker could read back. Matching the whole shape means a
// path either looks exactly like something we generated or it is refused.
const UUID_PATTERN = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"

// `{uuid}-{safeName}`, where safeName is fileName run through
// createSignedDocumentUpload's `[^a-zA-Z0-9._-] -> _` replacement.
const STORAGE_OBJECT_RE = new RegExp(`^${UUID_PATTERN}-[A-Za-z0-9._-]+$`)
const STORAGE_UUID_RE = new RegExp(`^${UUID_PATTERN}$`)

export type ParsedStoragePath = {
  orgId: string
  projectId: string
  objectName: string
}

/**
 * Parses a storage object key into its three known segments, or returns null
 * if it is not a path this app could have generated.
 *
 * Deliberately total: no normalisation, no "clean it up and carry on". A path
 * that doesn't match is rejected, because the only way to get one is a
 * hand-made request.
 */
export function parseStoragePath(value: string): ParsedStoragePath | null {
  // Reject anything that could be re-interpreted later by a URL parser, a
  // filesystem, or Storage itself, before even looking at the shape.
  if (value !== value.trim()) return null
  if (value.length === 0 || value.length > 1024) return null
  if (value.includes("\\")) return null
  if (value.includes("%")) return null // no percent-encoding: no %2e%2e smuggling
  if (value.includes("//")) return null
  if (value.startsWith("/") || value.endsWith("/")) return null
  // Control characters, checked by code point rather than with a regex so
  // there's no control-character literal in the source (and no lint
  // suppression to explain).
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    if (code <= 0x1f || code === 0x7f) return null
  }

  const segments = value.split("/")
  if (segments.length !== 3) return null
  // Belt and braces: the regexes below can't match "." or ".." anyway, but
  // this is the property that actually matters, so it is stated outright
  // rather than left implied by a character class.
  if (segments.some((segment) => segment === "." || segment === "..")) return null

  const [orgId, projectId, objectName] = segments
  if (!STORAGE_UUID_RE.test(orgId)) return null
  if (!STORAGE_UUID_RE.test(projectId)) return null
  if (!STORAGE_OBJECT_RE.test(objectName)) return null

  return { orgId, projectId, objectName }
}

// For the confirm-upload actions, so a malformed path fails as a clean
// ValidationError at the edge rather than reaching assertPathInOrg.
export const storagePathSchema = z
  .string()
  .trim()
  .min(1, "Storage path is required")
  .refine((value) => parseStoragePath(value) !== null, "Storage path is not valid")

// A DB `numeric` column stored as a string (Drizzle's convention for
// numeric/decimal). Validates it actually parses to a finite number before
// it reaches Postgres, rather than letting a non-numeric string either fail
// as a raw DB error or silently store as NaN-ish garbage.
export function numericString(message = "must be a number") {
  return z.string().refine((v) => v.trim() !== "" && Number.isFinite(Number(v)), message)
}

// Same, but empty string / null is allowed (for optional cost breakdown
// fields that are legitimately blank).
export function optionalNumericString(message = "must be a number") {
  return z
    .string()
    .nullable()
    .refine((v) => v == null || v.trim() === "" || Number.isFinite(Number(v)), message)
}
