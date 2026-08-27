"use client"

import * as React from "react"
import { Check, Pencil, RotateCcw, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import {
  confirmPlanHolderAction,
  unconfirmPlanHolderAction,
  updatePlanHolderAction,
  type PlanHolderContactView,
} from "@/app/plan-holders/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// Below this, the extractor is telling us it had to squint. Same threshold
// the review order in actions.ts sorts on, and the same idea as the sub quote
// screen's flags: say which rows are worth a human's attention rather than
// making every row look equally settled.
const LOW_CONFIDENCE = 90

/**
 * One extracted plan holder.
 *
 * Follows components/sub-quotes/condition-row.tsx: the state is carried by
 * the row itself — a coloured rail, a full-strength surface, a live Confirm
 * control — and a confirmed row keeps its shape but recedes to a muted
 * surface with a quiet undo. Nothing is stacked on top of the list to
 * announce a mode.
 *
 * The verbatim roster line sits directly above the parsed fields, which is
 * the whole point: on these documents the parse is the part that goes wrong,
 * and a reviewer can only catch that by reading the two together.
 */
export function HolderRow({
  holder,
  onChanged,
}: {
  holder: PlanHolderContactView
  onChanged: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [companyName, setCompanyName] = React.useState(holder.companyName)
  const [contactName, setContactName] = React.useState(holder.contactName ?? "")
  const [email, setEmail] = React.useState(holder.email ?? "")
  const [phone, setPhone] = React.useState(holder.phone ?? "")
  const [licenseNumber, setLicenseNumber] = React.useState(
    holder.licenseNumber ?? "",
  )

  const isLowConfidence =
    holder.confidence != null &&
    holder.confidence < LOW_CONFIDENCE &&
    !holder.isConfirmed

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

  // Nullable text fields go back as null, not "" — an empty string would
  // record "this roster prints an empty email", which is a different claim
  // from "this roster prints no email".
  const orNull = (value: string) => {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  const location = [holder.city, holder.state, holder.postalCode]
    .filter(Boolean)
    .join(", ")

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-l-4 p-4 transition-colors",
        holder.isConfirmed
          ? "border-l-success bg-muted"
          : isLowConfidence
            ? "border-l-warning bg-card"
            : "border-l-border bg-card",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {holder.sourcePage ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            p.{holder.sourcePage}
          </span>
        ) : null}
        {holder.confidence != null ? (
          <Badge variant="outline" className="tabular-nums">
            {Math.round(holder.confidence)}% confidence
          </Badge>
        ) : null}
        {isLowConfidence ? (
          <Badge
            variant="outline"
            className="border-warning text-warning-foreground"
            title={holder.notes ?? "The extractor was unsure about this row."}
          >
            <TriangleAlert aria-hidden="true" />
            Check this row
          </Badge>
        ) : null}
        {holder.isConfirmed ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
            <Check className="size-3" aria-hidden="true" />
            Confirmed
          </span>
        ) : null}
      </div>

      {/* Verbatim from the roster. Never editable — it is what makes the
          parse checkable, and it has to stay what the document said even
          after someone corrects the fields below it. */}
      <p className="rounded-md bg-muted/60 px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
        {holder.rawText}
      </p>

      {editing ? (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <Field>
            <FieldLabel htmlFor={`company-${holder.id}`}>Company</FieldLabel>
            <Input
              id={`company-${holder.id}`}
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`contact-${holder.id}`}>Contact</FieldLabel>
            <Input
              id={`contact-${holder.id}`}
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`email-${holder.id}`}>Email</FieldLabel>
              <Input
                id={`email-${holder.id}`}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`phone-${holder.id}`}>Phone</FieldLabel>
              <Input
                id={`phone-${holder.id}`}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor={`license-${holder.id}`}>
              Licence number
            </FieldLabel>
            <Input
              id={`license-${holder.id}`}
              value={licenseNumber}
              onChange={(event) => setLicenseNumber(event.target.value)}
              placeholder="As printed on the roster"
            />
          </Field>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await updatePlanHolderAction({
                    id: holder.id,
                    companyName: companyName.trim(),
                    contactName: orNull(contactName),
                    email: orNull(email),
                    phone: orNull(phone),
                    licenseNumber: orNull(licenseNumber),
                  })
                  setEditing(false)
                }, "Could not save this row.")
              }
            >
              Save and confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setCompanyName(holder.companyName)
                setContactName(holder.contactName ?? "")
                setEmail(holder.email ?? "")
                setPhone(holder.phone ?? "")
                setLicenseNumber(holder.licenseNumber ?? "")
                setEditing(false)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-0.5">
            <p
              className={cn(
                "text-sm font-semibold",
                holder.isConfirmed ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {holder.companyName}
            </p>
            {holder.contactName ? (
              <p className="text-sm text-muted-foreground">{holder.contactName}</p>
            ) : null}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              {holder.email ? <span>{holder.email}</span> : null}
              {holder.phone ? <span>{holder.phone}</span> : null}
              {holder.licenseNumber ? (
                <span>Lic. {holder.licenseNumber}</span>
              ) : null}
            </div>
            {holder.address || location ? (
              <p className="text-xs text-muted-foreground">
                {[holder.address, location].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>

          {/* The extractor's own note on why it was unsure. A chip alone
              would make a reviewer open the source to find out what the
              problem even was. */}
          {holder.notes && !holder.isConfirmed ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {holder.notes}
            </p>
          ) : null}

          <div className="flex gap-2">
            {holder.isConfirmed ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  run(
                    () => unconfirmPlanHolderAction(holder.id),
                    "Could not undo.",
                  )
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
                    run(
                      () => confirmPlanHolderAction(holder.id),
                      "Could not confirm this row.",
                    )
                  }
                >
                  <Check data-icon="inline-start" />
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setEditing(true)}
                >
                  <Pencil data-icon="inline-start" />
                  Correct
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </li>
  )
}
