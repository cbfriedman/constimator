import { describe, expect, it } from "vitest"

import { estimateCostUsd, pricingFor } from "@/lib/ai-limits"

// The spend cap is the only thing bounding what an org can run up in AI
// costs (docs/DECISIONS.md — usage deliberately isn't the billing axis), so
// these assertions are about it staying protective rather than about exact
// invoice accuracy.
describe("estimateCostUsd", () => {
  it("prices Sonnet 5 at its published rate", () => {
    // 1M input + 1M output at $3/$15.
    expect(estimateCostUsd("claude-sonnet-5", 1_000_000, 1_000_000)).toBeCloseTo(18)
  })

  it("prices Opus 5 higher than Sonnet 5 for identical usage", () => {
    // The actual regression this replaced: quote-conditions extraction runs
    // on Opus 5 but was billed against the cap at Sonnet 5's rate.
    const sonnet = estimateCostUsd("claude-sonnet-5", 500_000, 100_000)
    const opus = estimateCostUsd("claude-opus-5", 500_000, 100_000)
    expect(opus).toBeGreaterThan(sonnet)
    expect(opus).toBeCloseTo(5)
  })

  it("charges an unknown model at the highest known rate rather than the lowest", () => {
    const unknown = estimateCostUsd("some-model-shipped-after-this-was-written", 1_000_000, 0)
    const mostExpensiveKnown = estimateCostUsd("claude-fable-5", 1_000_000, 0)
    const cheapestKnown = estimateCostUsd("claude-haiku-4-5", 1_000_000, 0)

    expect(unknown).toBe(mostExpensiveKnown)
    expect(unknown).toBeGreaterThan(cheapestKnown)
  })

  it("costs nothing for zero tokens", () => {
    expect(estimateCostUsd("claude-opus-5", 0, 0)).toBe(0)
  })

  it("scales linearly with token count", () => {
    const once = estimateCostUsd("claude-sonnet-5", 10_000, 2_000)
    const twice = estimateCostUsd("claude-sonnet-5", 20_000, 4_000)
    expect(twice).toBeCloseTo(once * 2)
  })
})

describe("pricingFor", () => {
  it("never returns an output rate below its input rate", () => {
    // Anthropic prices output above input on every model; a table entry that
    // inverted them would be a typo, and a cheap typo to catch.
    for (const model of [
      "claude-fable-5",
      "claude-opus-5",
      "claude-sonnet-5",
      "claude-haiku-4-5",
      "unknown-model",
    ]) {
      const pricing = pricingFor(model)
      expect(pricing.outputPerMillionUsd).toBeGreaterThan(pricing.inputPerMillionUsd)
    }
  })
})
