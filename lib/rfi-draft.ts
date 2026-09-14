import { formatQty, type SheetMatrixCell } from "@/lib/sheet-matrix"

// Turns one matrix cell into the RFI a contractor would send the agency
// about it. Same register as the hand-written examples in
// lib/rfi-suggestions-data.ts — cite the bid item, cite the sheet, quote
// what the sheet says, ask which governs — but built from real rows, which
// is what makes the Risks & RFIs idea a capability rather than a demo.
//
// Deliberately templated, not AI-written. The contractor is about to put
// this in front of the agency under their own name; a draft they can read
// in full and predict from the row beats a fluent one they have to vet.

export type RfiDraft = {
  title: string
  body: string
}

function describeSource(cell: SheetMatrixCell): string {
  switch (cell.sourceKind) {
    case "schedule":
      return "the schedule"
    case "summary":
      return "the summary of quantities"
    case "note":
      return "a general note"
    case "profile":
      return "the profile"
    case "callout":
      return "a callout"
    default:
      return "the quantity shown"
  }
}

function sheetReference(cell: SheetMatrixCell): string {
  return cell.sheetTitle ? `Sheet ${cell.sheetNumber} (${cell.sheetTitle})` : `Sheet ${cell.sheetNumber}`
}

function quoted(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ")
  return trimmed ? ` — "${trimmed}"` : ""
}

export function draftSheetRfi(cell: SheetMatrixCell): RfiDraft {
  const sheet = sheetReference(cell)
  const stated = `${formatQty(cell.statedQty)} ${cell.calloutUnit}`

  if (cell.status === "unlinked" || cell.bidId == null || cell.officialQty == null) {
    return {
      title: `Missing bid item: ${cell.calloutDescription}`,
      body:
        `${sheet} shows ${stated} of ${cell.calloutDescription} in ${describeSource(cell)}${quoted(cell.sourceText)}. ` +
        `We were unable to locate a corresponding pay item on the official bid schedule. ` +
        `Please confirm whether this work is incidental to another bid item (and if so, which), ` +
        `or whether a separate pay item will be added by addendum.`,
    }
  }

  const item = `Bid Item ${cell.itemNumber} (${cell.description})`
  const official = `${formatQty(cell.officialQty)} ${cell.unit}`

  if (cell.status === "lump_sum") {
    return {
      title: `Scope confirmation: ${cell.description}`,
      body:
        `${item} is a lump-sum item on the official bid form. ${sheet} shows ${stated}` +
        ` in ${describeSource(cell)}${quoted(cell.sourceText)}. ` +
        `Please confirm that this quantity is included in the lump-sum scope of ${item} ` +
        `and that no separate measurement or payment applies.`,
    }
  }

  const direction =
    cell.diffQty != null && cell.diffQty > 0 ? "exceeds" : "is less than"
  const difference =
    cell.diffQty != null
      ? ` a difference of ${formatQty(Math.abs(cell.diffQty))} ${cell.unit}` +
        (cell.diffPct != null ? ` (${Math.abs(cell.diffPct).toFixed(1)}%)` : "")
      : ""

  return {
    title: `Quantity discrepancy: ${cell.description}`,
    body:
      `${item} lists a quantity of ${official} on the official bid form. ` +
      `${sheet} shows ${stated} in ${describeSource(cell)}${quoted(cell.sourceText)}, ` +
      `which ${direction} the bid quantity by${difference}. ` +
      `Please confirm whether the bid form quantity of ${official} governs, ` +
      `or whether it should be revised to reflect ${sheet}. ` +
      `If ${official} governs, please confirm how the balance shown on the plans is to be measured and paid.`,
  }
}
