import { describe, expect, it } from "vitest"

import { parseInput, parseStoragePath, storagePathSchema, ValidationError } from "@/lib/validation"

// A well-formed path, exactly as createSignedDocumentUpload builds it:
// `{orgId}/{projectId}/{uuid}-{safeName}`.
const ORG = "11111111-1111-4111-8111-111111111111"
const PROJECT = "22222222-2222-4222-8222-222222222222"
const OBJECT = "33333333-3333-4333-8333-333333333333-Plans.pdf"
const VALID = `${ORG}/${PROJECT}/${OBJECT}`

// These assertions exist because `path` used to be validated as nothing more
// than a non-empty string, and the only other guard was
// `path.startsWith(`${orgId}/`)`. That combination accepted a traversal
// path, and the worker downloads whatever a document row says using the
// service-role key — which bypasses Storage RLS. So these are about keeping
// the hole shut, not about input hygiene in general.
describe("parseStoragePath", () => {
  it("accepts a path of the shape the app actually generates", () => {
    expect(parseStoragePath(VALID)).toEqual({
      orgId: ORG,
      projectId: PROJECT,
      objectName: OBJECT,
    })
  })

  it("accepts the sanitised characters a real file name can produce", () => {
    // createSignedDocumentUpload maps anything outside [a-zA-Z0-9._-] to "_",
    // so these four are the full set of punctuation that can survive.
    const name = "44444444-4444-4444-8444-444444444444-Shasta_Co.Roadway-24.118.pdf"
    expect(parseStoragePath(`${ORG}/${PROJECT}/${name}`)).not.toBeNull()
  })

  it("rejects the traversal path that defeated the old startsWith check", () => {
    // The whole point: this really does start with `${ORG}/`.
    const traversal = `${ORG}/../${PROJECT}/${OBJECT}`
    expect(traversal.startsWith(`${ORG}/`)).toBe(true)
    expect(parseStoragePath(traversal)).toBeNull()
  })

  it("rejects a percent-encoded traversal", () => {
    expect(parseStoragePath(`${ORG}/%2e%2e/${PROJECT}/${OBJECT}`)).toBeNull()
    // Any "%" at all, so there is no second decoding pass to reason about.
    expect(parseStoragePath(`${ORG}/${PROJECT}/${OBJECT}%20`)).toBeNull()
  })

  it("rejects a single-dot segment", () => {
    expect(parseStoragePath(`${ORG}/./${OBJECT}`)).toBeNull()
  })

  it("rejects backslashes, which some path handlers treat as separators", () => {
    expect(parseStoragePath(`${ORG}\\${PROJECT}\\${OBJECT}`)).toBeNull()
  })

  it("rejects the wrong number of segments", () => {
    expect(parseStoragePath(ORG)).toBeNull()
    expect(parseStoragePath(`${ORG}/${PROJECT}`)).toBeNull()
    expect(parseStoragePath(`${ORG}/${PROJECT}/extra/${OBJECT}`)).toBeNull()
  })

  it("rejects leading, trailing and doubled slashes", () => {
    expect(parseStoragePath(`/${VALID}`)).toBeNull()
    expect(parseStoragePath(`${VALID}/`)).toBeNull()
    expect(parseStoragePath(`${ORG}//${PROJECT}/${OBJECT}`)).toBeNull()
  })

  it("rejects segments that are not the ids and object name we generate", () => {
    expect(parseStoragePath(`not-a-uuid/${PROJECT}/${OBJECT}`)).toBeNull()
    expect(parseStoragePath(`${ORG}/not-a-uuid/${OBJECT}`)).toBeNull()
    // Object name must be uuid-prefixed; a bare file name is not something
    // createSignedDocumentUpload could have produced.
    expect(parseStoragePath(`${ORG}/${PROJECT}/Plans.pdf`)).toBeNull()
  })

  it("rejects control characters and untrimmed input", () => {
    expect(parseStoragePath(`${ORG}/${PROJECT}/${OBJECT}\n`)).toBeNull()
    expect(parseStoragePath(` ${VALID}`)).toBeNull()
    expect(parseStoragePath("")).toBeNull()
  })
})

describe("storagePathSchema", () => {
  it("passes a generated path through unchanged", () => {
    expect(parseInput(storagePathSchema, VALID)).toBe(VALID)
  })

  it("fails a traversal path as a ValidationError, not a DB error", () => {
    expect(() => parseInput(storagePathSchema, `${ORG}/../${PROJECT}/${OBJECT}`)).toThrow(
      ValidationError,
    )
  })
})
