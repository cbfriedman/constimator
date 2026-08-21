"use client"

import * as React from "react"
import { Check, CircleSlash, Minus, X } from "lucide-react"
import { toast } from "sonner"

import { setPrimeCostAction } from "@/app/sub-quotes/actions"
import { Input } from "@/components/ui/input"
import type { CellStance, ComparisonCell } from "@/lib/quote-comparison"
import { cn } from "@/lib/utils"

/**
 * One sub's answer on one condition row.
 *
 * The four states are carried by shape and icon as well as colour, so the grid
 * is readable without relying on hue — a red/green grid is unusable for a
 * meaningful share of estimators, and this is a screen people make money
 * decisions on.
 *
 * "Not stated" is styled to read as absence — an empty outline and a dash —
 * rather than as a weaker kind of exclusion. They are genuinely different
 * facts: an exclusion is a sub telling you they won't do it, and silence is a
 * sub who may simply have assumed it. The prime chases those differently.
 */
const STANCE_STYLES: Record<CellStance, string> = {
  included: "border-success bg-card text-success",
  excluded: "border-destructive bg-card text-destructive",
  value: "border-border bg-card text-foreground",
  not_stated: "border-dashed border-border bg-transparent text-muted-foreground",
}

const STANCE_LABELS: Record<CellStance, string> = {
  included: "Included",
  excluded: "Excluded",
  value: "Stated",
  not_stated: "Not stated",
}

function StanceIcon({ stance }: { stance: CellStance }) {
  switch (stance) {
    case "included":
      return <Check className="size-3.5 shrink-0" aria-hidden="true" />
    case "excluded":
      return <X className="size-3.5 shrink-0" aria-hidden="true" />
    case "not_stated":
      return <Minus className="size-3.5 shrink-0" aria-hidden="true" />
    default:
      return <CircleSlash className="size-3.5 shrink-0 opacity-0" aria-hidden="true" />
  }
}

export function ComparisonGridCell({
  cell,
  onCostChanged,
}: {
  cell: ComparisonCell
  onCostChanged: () => void
}) {
  return (
    <td className="align-top p-1.5">
      <div
        className={cn(
          "flex h-full flex-col gap-1.5 rounded-lg border p-2.5",
          STANCE_STYLES[cell.stance],
        )}
      >
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <StanceIcon stance={cell.stance} />
          <span>{STANCE_LABELS[cell.stance]}</span>
        </div>

        {cell.entries.map((entry) => (
          <div key={entry.conditionId} className="flex flex-col gap-1">
            <p className="text-xs leading-relaxed text-foreground">
              {entry.detail}
              {!entry.isConfirmed ? (
                <span
                  className="ml-1 align-middle text-muted-foreground"
                  title="Not yet confirmed against the original quote"
                >
                  (unverified)
                </span>
              ) : null}
            </p>
            {entry.stance === "excluded" ? (
              <PrimeCostInput
                conditionId={entry.conditionId}
                value={entry.primeCostUsd}
                onSaved={onCostChanged}
              />
            ) : null}
          </div>
        ))}
      </div>
    </td>
  )
}

/**
 * What it costs the prime to cover this exclusion themselves. Left blank it
 * stays uncosted, which the column header reports as making the adjusted price
 * provisional — an unpriced exclusion is never silently treated as free.
 */
function PrimeCostInput({
  conditionId,
  value,
  onSaved,
}: {
  conditionId: string
  value: number | null
  onSaved: () => void
}) {
  const [draft, setDraft] = React.useState(value == null ? "" : String(value))
  const [saving, setSaving] = React.useState(false)

  async function commit() {
    const trimmed = draft.trim()
    const parsed = trimmed === "" ? null : Number(trimmed)

    if (parsed != null && (!Number.isFinite(parsed) || parsed < 0)) {
      toast.error("Enter a cost of zero or more, or leave it blank.")
      setDraft(value == null ? "" : String(value))
      return
    }
    if (parsed === value) return

    setSaving(true)
    try {
      await setPrimeCostAction({ conditionId, amountUsd: parsed })
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save that cost.")
      setDraft(value == null ? "" : String(value))
    } finally {
      setSaving(false)
    }
  }

  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">Your cost to cover this exclusion</span>
      <span aria-hidden="true" className="text-xs text-muted-foreground">
        $
      </span>
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur()
        }}
        disabled={saving}
        inputMode="decimal"
        placeholder="Your cost"
        className="h-7 text-xs tabular-nums"
      />
    </label>
  )
}
