/**
 * Shared constants + pure helpers for "which project is the contractor
 * working on." The cookie is the durable selection; `?project=` on a URL
 * is the explicit override (dashboard click, sidebar link) and is copied
 * onto a request header in middleware so the root layout — which cannot
 * read searchParams — sees the same project on that same request.
 */

export const CURRENT_PROJECT_COOKIE = "constimator-project-id"
export const CURRENT_PROJECT_HEADER = "x-constimator-project"

export const PROJECT_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  secure: process.env.NODE_ENV === "production",
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isProjectId(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value)
}

export type ProjectIdentity = {
  id: string
  createdAt: Date | string
}

function createdAtMs(value: Date | string): number {
  const ms = (value instanceof Date ? value : new Date(value)).getTime()
  return Number.isNaN(ms) ? 0 : ms
}

/** Newest-created project — used only when nothing has been selected yet. */
export function pickNewestProject<T extends ProjectIdentity>(rows: T[]): T | null {
  if (rows.length === 0) return null
  return [...rows].sort((a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt))[0]
}

/**
 * Resolve the working project: an explicit requested id (query/header/cookie)
 * if it belongs to this org, otherwise the newest project.
 */
export function resolveCurrentProject<T extends ProjectIdentity>(
  rows: T[],
  requestedId: string | null | undefined,
): T | null {
  if (rows.length === 0) return null
  if (requestedId) {
    const match = rows.find((row) => row.id === requestedId)
    if (match) return match
  }
  return pickNewestProject(rows)
}

/** Routes that are not tied to a single project. */
const GLOBAL_PATHS = new Set([
  "/dashboard",
  "/projects",
  "/projects/new",
  "/new-project",
  "/team",
  "/billing",
  "/settings",
  "/help",
])

export function withProjectQuery(href: string, projectId: string | null): string {
  if (!projectId || GLOBAL_PATHS.has(href) || href.startsWith("/projects/")) {
    return href
  }
  const hashIndex = href.indexOf("#")
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : ""
  const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href
  const [path, existingQuery = ""] = withoutHash.split("?")
  const params = new URLSearchParams(existingQuery)
  params.set("project", projectId)
  const query = params.toString()
  return `${path}?${query}${hash}`
}
