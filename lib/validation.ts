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
