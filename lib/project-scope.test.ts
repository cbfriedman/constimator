import { describe, expect, it } from "vitest"

import {
  pickNewestProject,
  resolveCurrentProject,
  withProjectQuery,
} from "@/lib/project-scope"

const older = { id: "older", createdAt: new Date("2026-01-01") }
const newer = { id: "newer", createdAt: new Date("2026-08-01") }

describe("resolveCurrentProject", () => {
  it("returns the requested project when it belongs to the org", () => {
    expect(resolveCurrentProject([older, newer], "older")?.id).toBe("older")
  })

  it("falls back to the newest project when nothing is requested", () => {
    expect(resolveCurrentProject([older, newer], null)?.id).toBe("newer")
  })

  it("falls back when the requested id is not in the org", () => {
    expect(resolveCurrentProject([older, newer], "missing")?.id).toBe("newer")
  })
})

describe("pickNewestProject", () => {
  it("returns null for an empty list", () => {
    expect(pickNewestProject([])).toBeNull()
  })
})

describe("withProjectQuery", () => {
  it("appends ?project= on tool routes", () => {
    expect(withProjectQuery("/estimate", "abc")).toBe("/estimate?project=abc")
  })

  it("leaves global routes alone", () => {
    expect(withProjectQuery("/dashboard", "abc")).toBe("/dashboard")
    expect(withProjectQuery("/projects", "abc")).toBe("/projects")
  })

  it("preserves an existing query string", () => {
    expect(withProjectQuery("/sub-quotes?quote=q1", "abc")).toBe(
      "/sub-quotes?quote=q1&project=abc",
    )
  })
})
