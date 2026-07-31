import type { PlanSetResult } from "./types.js"

function byTradeThenDescription<T extends { trade: string; description: string }>(
  a: T,
  b: T,
) {
  return a.trade.localeCompare(b.trade) || a.description.localeCompare(b.description)
}

/**
 * Prints known-correct quantities next to what Claude extracted, grouped by
 * trade. Deliberately doesn't try to auto-match rows between the two lists —
 * descriptions won't line up 1:1, and guessing at matches would just hide
 * the thing you're actually trying to see by eye.
 */
export function printComparison(result: PlanSetResult) {
  const { planSetName, known, extracted, pageCount } = result

  console.log(`\n${"=".repeat(72)}`)
  console.log(`${planSetName} — ${known.projectName}`)
  console.log(`${pageCount} page(s) sent to Claude`)
  console.log("=".repeat(72))

  console.log(`\n--- YOUR KNOWN-CORRECT QUANTITIES (${known.items.length}) ---`)
  console.table(
    [...known.items].sort(byTradeThenDescription).map((item) => ({
      Trade: item.trade,
      Description: item.description,
      Qty: item.quantity,
      Unit: item.unit,
      Notes: item.notes ?? "",
    })),
  )

  console.log(`\n--- CLAUDE-EXTRACTED QUANTITIES (${extracted.length}) ---`)
  console.table(
    [...extracted].sort(byTradeThenDescription).map((item) => ({
      Trade: item.trade,
      Description: item.description,
      Qty: item.quantity,
      Unit: item.unit,
      Confidence: `${item.confidence}%`,
      Sheets: item.sourceSheets ?? "",
      Notes: item.notes ?? "",
    })),
  )

  const lowConfidence = extracted.filter((item) => item.confidence < 60)
  if (lowConfidence.length > 0) {
    console.log(
      `\n${lowConfidence.length} item(s) Claude flagged as low-confidence (<60%) — check these first:`,
    )
    for (const item of lowConfidence) {
      console.log(`  - ${item.description}: ${item.notes ?? "(no note given)"}`)
    }
  }
}
