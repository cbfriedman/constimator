import { describe, expect, it } from "vitest"

import { safeSpecUrl } from "@/lib/spec-links"

describe("safeSpecUrl", () => {
  it("keeps a plain web address", () => {
    expect(safeSpecUrl("https://dot.ca.gov/programs/civil-rights/dbe")).toBe(
      "https://dot.ca.gov/programs/civil-rights/dbe",
    )
    expect(safeSpecUrl("http://cms.dot.ca.gov/dbe")).toBe("http://cms.dot.ca.gov/dbe")
  })

  it("adds a scheme to the bare addresses specs usually print", () => {
    expect(safeSpecUrl("www.dot.ca.gov/dbe")).toBe("https://www.dot.ca.gov/dbe")
    expect(safeSpecUrl("caleprocure.ca.gov")).toBe("https://caleprocure.ca.gov/")
  })

  it("strips the punctuation a URL picks up mid-sentence", () => {
    expect(safeSpecUrl("<https://dot.ca.gov/dbe>")).toBe("https://dot.ca.gov/dbe")
    expect(safeSpecUrl("(https://dot.ca.gov/dbe)")).toBe("https://dot.ca.gov/dbe")
    expect(safeSpecUrl("https://dot.ca.gov/dbe.")).toBe("https://dot.ca.gov/dbe")
    expect(safeSpecUrl("  https://dot.ca.gov/dbe,  ")).toBe("https://dot.ca.gov/dbe")
  })

  // The point of the function. These reach an <a href>, where React escapes
  // the text but not the scheme.
  it("rejects every scheme that isn't http or https", () => {
    expect(safeSpecUrl("javascript:alert(1)")).toBeNull()
    expect(safeSpecUrl("JavaScript:alert(1)")).toBeNull()
    expect(safeSpecUrl("data:text/html;base64,PHNjcmlwdD4=")).toBeNull()
    expect(safeSpecUrl("vbscript:msgbox(1)")).toBeNull()
    expect(safeSpecUrl("file:///etc/passwd")).toBeNull()
    expect(safeSpecUrl("mailto:dbe@dot.ca.gov")).toBeNull()
  })

  it("rejects what isn't an address at all", () => {
    expect(safeSpecUrl("")).toBeNull()
    expect(safeSpecUrl("   ")).toBeNull()
    expect(safeSpecUrl("see the Department's website")).toBeNull()
    expect(safeSpecUrl("/forms/dbe-declaration.pdf")).toBeNull()
    expect(safeSpecUrl("localhost:3000")).toBeNull()
  })
})
