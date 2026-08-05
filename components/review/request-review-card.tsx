"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { toast } from "sonner"

import { requestReviewAction } from "@/app/review/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { useProjectState } from "@/components/project-state-provider"

export function RequestReviewCard({
  projectId,
  onRequested,
}: {
  projectId: string
  onRequested: () => void
}) {
  const { currentProjectDaysOut, attentionCount } = useProjectState()
  const scopeOptions = [
    {
      id: "full" as const,
      label: "Full estimate review",
      description: "Every line item, quantities, and pricing.",
      defaultChecked: false,
    },
    {
      id: "reconciliation" as const,
      label: "Bid form reconciliation review",
      description: "Verify estimate lines against the official bid form.",
      defaultChecked: true,
    },
    {
      id: "discrepancy" as const,
      label: "Quantity discrepancy review",
      description: `Focus on the ${attentionCount} flagged item${attentionCount === 1 ? "" : "s"}.`,
      badge: attentionCount > 0 ? `${attentionCount} flagged items` : undefined,
      defaultChecked: attentionCount > 0,
    },
    {
      id: "proposal" as const,
      label: "Final proposal review",
      description: "Sign-off on the packaged bid proposal.",
      defaultChecked: false,
    },
  ]
  const [checked, setChecked] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(scopeOptions.map((o) => [o.id, o.defaultChecked])),
  )
  const [notes, setNotes] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  async function handleSubmit() {
    const scope = scopeOptions.filter((o) => checked[o.id]).map((o) => o.id)
    if (scope.length === 0) {
      toast.error("Select at least one review scope")
      return
    }

    setSubmitting(true)
    try {
      await requestReviewAction({ projectId, scope, notes })
      toast.success("Review request submitted")
      onRequested()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit — try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Human Review</CardTitle>
        <CardDescription>
          Choose what you&apos;d like a second set of eyes on before you bid.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          {scopeOptions.map((option) => {
            const isChecked = checked[option.id]
            return (
              <label
                key={option.id}
                htmlFor={`scope-${option.id}`}
                className={
                  isChecked
                    ? "flex cursor-pointer items-start gap-3 rounded-lg border border-primary bg-primary/5 p-4"
                    : "flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-4"
                }
              >
                <Checkbox
                  id={`scope-${option.id}`}
                  checked={isChecked}
                  onCheckedChange={(value) =>
                    setChecked((prev) => ({ ...prev, [option.id]: !!value }))
                  }
                  className="mt-0.5"
                />
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{option.label}</span>
                    {option.badge ? (
                      <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                        {option.badge}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </div>
              </label>
            )
          })}
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
          <Clock className="size-4 shrink-0 text-primary" />
          <span>
            We aim to follow up within 1&ndash;2 business days.
            {currentProjectDaysOut !== null
              ? ` Bid date is ${currentProjectDaysOut} ${currentProjectDaysOut === 1 ? "day" : "days"} away.`
              : null}
          </span>
        </div>

        <Field>
          <FieldLabel htmlFor="reviewer-notes">Notes (optional)</FieldLabel>
          <Textarea
            id="reviewer-notes"
            rows={3}
            placeholder="Anything specific you'd like checked?"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Submitting…" : "Request Human Review"}
        </Button>
      </CardFooter>
    </Card>
  )
}
