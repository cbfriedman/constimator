"use client"

import * as React from "react"
import { Check, Pencil, RotateCcw, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import {
  confirmConditionAction,
  unconfirmConditionAction,
  updateConditionAction,
  type ConditionView,
} from "@/app/sub-quotes/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CONDITION_CATEGORY_LABELS } from "@/lib/quote-review"
import { cn } from "@/lib/utils"

const CATEGORY_OPTIONS = Object.entries(CONDITION_CATEGORY_LABELS)

/**
 * One extracted condition.
 *
 * "Unconfirmed items render in a visually distinct state — a state, not a
 * banner": the distinction is carried by the row itself — a coloured rail, a
 * full-strength surface, and a live Confirm control. A confirmed row keeps the
 * same shape but recedes: muted surface, green rail, its action collapsed to a
 * quiet undo. Nothing is stacked on top of the list to announce a mode, and
 * the states stay legible if you scan the column of rails alone.
 */
export function ConditionRow({
  condition,
  isSelected,
  onSelect,
  onChanged,
}: {
  condition: ConditionView
  isSelected: boolean
  onSelect: () => void
  onChanged: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [category, setCategory] = React.useState(condition.category)
  const [normalizedValue, setNormalizedValue] = React.useState(condition.normalizedValue ?? "")

  const isFlagged = condition.riskScore > 0 && !condition.isConfirmed

  async function run(action: () => Promise<void>, failure: string) {
    setPending(true)
    try {
      await action()
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : failure)
    } finally {
      setPending(false)
    }
  }

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-l-4 p-4 transition-colors",
        condition.isConfirmed
          ? "border-l-success bg-muted"
          : isFlagged
            ? "border-l-warning bg-card"
            : "border-l-border bg-card",
        isSelected && "border-ring",
      )}
    >
      {/* The whole row is the jump-to-source target. A button rather than a
          click handler on the li so it is reachable by keyboard. */}
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-col items-start gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{condition.categoryLabel}</Badge>
          {condition.sourcePage ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              p.{condition.sourcePage}
            </span>
          ) : null}
          {condition.flags.map((flag) => (
            <Badge
              key={flag.kind}
              variant="outline"
              className="border-warning text-warning-foreground"
              title={flag.detail}
            >
              <TriangleAlert aria-hidden="true" />
              {flag.label}
            </Badge>
          ))}
          {condition.isConfirmed ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
              <Check className="size-3" aria-hidden="true" />
              Confirmed
            </span>
          ) : null}
        </div>

        <p
          className={cn(
            "text-sm leading-relaxed",
            condition.isConfirmed ? "text-muted-foreground" : "text-foreground",
          )}
        >
          &ldquo;{condition.rawText}&rdquo;
        </p>

        {condition.normalizedValue && !editing ? (
          <p className="text-xs text-muted-foreground">
            Means: <span className="text-foreground">{condition.normalizedValue}</span>
          </p>
        ) : null}
      </button>

      {/* Each flag says what specifically is risky, rather than only that
          something is. A chip alone would make the estimator open the source
          to find out why it was flagged at all. */}
      {isFlagged ? (
        <ul className="flex flex-col gap-1">
          {condition.flags.map((flag) => (
            <li key={flag.kind} className="text-xs leading-relaxed text-muted-foreground">
              {flag.detail}
            </li>
          ))}
        </ul>
      ) : null}

      {editing ? (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <Field>
            <FieldLabel htmlFor={`category-${condition.id}`}>Category</FieldLabel>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value ?? condition.category)}
            >
              <SelectTrigger id={`category-${condition.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor={`meaning-${condition.id}`}>
              What it means, in comparable terms
            </FieldLabel>
            <Input
              id={`meaning-${condition.id}`}
              value={normalizedValue}
              onChange={(event) => setNormalizedValue(event.target.value)}
              placeholder="e.g. 2 mobilizations included, $1,850 each"
            />
          </Field>
          {/* The quoted wording above is not editable — it is verbatim from
              the document, and it is what makes the source findable. */}
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    updateConditionAction({
                      id: condition.id,
                      category,
                      normalizedValue: normalizedValue.trim() || null,
                    }).then(() => setEditing(false)),
                  "Could not save this correction.",
                )
              }
            >
              {pending ? "Saving…" : "Save and confirm"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setCategory(condition.category)
                setNormalizedValue(condition.normalizedValue ?? "")
                setEditing(false)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {condition.isConfirmed ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                run(() => unconfirmConditionAction(condition.id), "Could not undo this.")
              }
            >
              <RotateCcw data-icon="inline-start" />
              Undo
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(() => confirmConditionAction(condition.id), "Could not confirm this.")
                }
              >
                <Check data-icon="inline-start" />
                Confirm
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditing(true)}>
                <Pencil data-icon="inline-start" />
                Edit
              </Button>
            </>
          )}
        </div>
      )}
    </li>
  )
}
