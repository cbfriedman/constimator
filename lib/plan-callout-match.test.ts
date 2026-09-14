import { describe, expect, it } from "vitest"

import {
  descriptionTokens,
  matchBidItem,
  normalizeUnit,
  type MatchableBid,
} from "./plan-callout-match"

function bid(itemNumber: string, description: string, unit: string): MatchableBid {
  return { id: `bid-${itemNumber}`, itemNumber, description, unit }
}

const BIDS: MatchableBid[] = [
  bid("1", "Mobilization", "LS"),
  bid("2", "Roadway Excavation", "CY"),
  bid("3", "Class 2 Aggregate Base", "CY"),
  bid("4", "Hot Mix Asphalt (Type A)", "TON"),
  bid("5", "Cold Plane Asphalt Concrete Pavement", "SY"),
  bid("8", 'Reinforced Concrete Pipe, 18", Class III', "LF"),
  bid("9", 'Reinforced Concrete Pipe, 24", Class III', "LF"),
  bid("10", "Drainage Inlet, Type G1", "EA"),
  bid("13", "Roadside Sign, One Post", "EA"),
  bid("14", "Concrete Sidewalk", "SF"),
  bid("15", "Concrete Curb and Gutter", "LF"),
]

describe("normalizeUnit", () => {
  it("collapses the spellings a bid form and a plan sheet use for one unit", () => {
    expect(normalizeUnit("L.S.")).toBe("ls")
    expect(normalizeUnit("Lump Sum")).toBe("ls")
    expect(normalizeUnit("Lin. Ft.")).toBe("lf")
    expect(normalizeUnit("LF")).toBe("lf")
    expect(normalizeUnit("Cu. Yd.")).toBe("cy")
    expect(normalizeUnit("TONS")).toBe("ton")
    expect(normalizeUnit("Each")).toBe("ea")
  })

  it("keeps an unknown unit comparable to itself", () => {
    expect(normalizeUnit("STA")).toBe("sta")
    expect(normalizeUnit("Sta.")).toBe("sta")
  })
})

describe("descriptionTokens", () => {
  it("normalizes every way a drafter writes a size", () => {
    for (const text of ['18" RCP', "18 inch RCP", "18-inch RCP", "18in RCP", "18.0\" RCP"]) {
      expect(descriptionTokens(text)).toEqual(new Set(["18in", "reinforced", "concrete"]))
    }
  })

  it("expands abbreviations and converts roman class numbers", () => {
    expect(descriptionTokens("RCP CL III")).toEqual(new Set(["reinforced", "concrete", "class", "3"]))
    expect(descriptionTokens("Reinforced Concrete Pipe, Class 3")).toEqual(
      new Set(["reinforced", "concrete", "class", "3"]),
    )
  })

  it("drops words that carry no identity", () => {
    expect(descriptionTokens("Furnish and install new Type G1 inlet")).toEqual(
      new Set(["type", "g1", "inlet"]),
    )
  })
})

describe("matchBidItem", () => {
  it("links a schedule row's abbreviation to the bid form's long-hand description", () => {
    const match = matchBidItem({ description: '18" RCP CL III', unit: "LF" }, BIDS)
    expect(match?.bid.itemNumber).toBe("8")
    expect(match?.source).toBe("description")
  })

  it("never confuses two sizes of the same pipe", () => {
    expect(matchBidItem({ description: '24" RCP', unit: "LF" }, BIDS)?.bid.itemNumber).toBe("9")
    expect(matchBidItem({ description: '18" RCP', unit: "LF" }, BIDS)?.bid.itemNumber).toBe("8")
    expect(matchBidItem({ description: '30" RCP', unit: "LF" }, BIDS)).toBeNull()
  })

  it("matches on the tokens that identify the item regardless of word order", () => {
    expect(matchBidItem({ description: "Type G1 Inlet", unit: "EA" }, BIDS)?.bid.itemNumber).toBe(
      "10",
    )
    expect(matchBidItem({ description: "HMA Type A", unit: "TON" }, BIDS)?.bid.itemNumber).toBe("4")
    expect(matchBidItem({ description: "Cold Plane AC", unit: "SY" }, BIDS)?.bid.itemNumber).toBe(
      "5",
    )
  })

  it("requires the units to agree", () => {
    expect(matchBidItem({ description: "Roadway Excavation", unit: "TON" }, BIDS)).toBeNull()
    expect(matchBidItem({ description: "Roadway Excavation", unit: "Cu. Yd." }, BIDS)?.bid.itemNumber).toBe(
      "2",
    )
  })

  it("does not pick between two equally plausible items", () => {
    // "Concrete" alone shares one token with both items and nothing more —
    // a coin flip, so it must not be one.
    expect(
      matchBidItem({ description: "Concrete", unit: "LF" }, [
        bid("20", "Concrete Curb", "LF"),
        bid("21", "Concrete Barrier", "LF"),
      ]),
    ).toBeNull()
  })

  it("does not match on a single shared generic word", () => {
    expect(matchBidItem({ description: "Concrete Sidewalk", unit: "LF" }, BIDS)).toBeNull()
  })

  it("prefers the extractor's item-number hint when it names a real item of the same unit", () => {
    const match = matchBidItem(
      { description: "Sign (post-mounted)", unit: "EA", bidItemNumber: "13" },
      BIDS,
    )
    expect(match?.bid.itemNumber).toBe("13")
    expect(match?.source).toBe("ai")
  })

  it("tolerates leading zeros and case in the hinted item number", () => {
    expect(
      matchBidItem({ description: "Mob", unit: "L.S.", bidItemNumber: "01" }, BIDS)?.bid.itemNumber,
    ).toBe("1")
  })

  it("ignores a hint whose unit disagrees and falls back to the description", () => {
    // The hint says item 8 (LF) but the callout is a count — the hint is
    // wrong and must not be trusted just because the number exists.
    const match = matchBidItem(
      { description: "Type G1 Drainage Inlet", unit: "EA", bidItemNumber: "8" },
      BIDS,
    )
    expect(match?.bid.itemNumber).toBe("10")
    expect(match?.source).toBe("description")
  })

  it("ignores a hint that names no bid item at all", () => {
    expect(
      matchBidItem({ description: "Dewatering", unit: "LS", bidItemNumber: "99" }, BIDS),
    ).toBeNull()
  })

  it("returns null for an empty description", () => {
    expect(matchBidItem({ description: "", unit: "LF" }, BIDS)).toBeNull()
  })
})
