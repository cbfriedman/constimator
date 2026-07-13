"use client"

import * as React from "react"
import { Clock } from "lucide-react"

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

const scopeOptions = [
  {
    id: "full",
    label: "Full estimate review",
    description: "Every line item, quantities, and pricing.",
    defaultChecked: false,
  },
  {
    id: "reconciliation",
    label: "Bid form reconciliation review",
    description: "Verify estimate lines against the official bid form.",
    defaultChecked: true,
  },
  {
    id: "discrepancy",
    label: "Quantity discrepancy review",
    description: "Focus on the 3 flagged items.",
    badge: "3 flagged items",
    defaultChecked: true,
  },
  {
    id: "proposal",
    label: "Final proposal review",
    description: "Sign-off on the packaged bid proposal.",
    defaultChecked: false,
  },
]

export function RequestReviewCard({ onRequest }: { onRequest: () => void }) {
  const [checked, setChecked] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(scopeOptions.map((o) => [o.id, !!o.defaultChecked])),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Human Review</CardTitle>
        <CardDescription>
          Choose what a licensed estimator should verify before you bid.
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
            Typical turnaround 1&ndash;2 business days. Bid date is 42 days away.
          </span>
        </div>

        <Field>
          <FieldLabel htmlFor="reviewer-notes">Notes to reviewer</FieldLabel>
          <Textarea
            id="reviewer-notes"
            rows={3}
            defaultValue="Please verify the RCP quantity on C-301 and the sign count conflict."
          />
        </Field>
      </CardContent>
      <CardFooter>
        <Button onClick={onRequest}>Request Human Review</Button>
      </CardFooter>
    </Card>
  )
}
