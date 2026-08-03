"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Role } from "@/app/team/actions"

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  estimator: "Estimator",
  pm: "Project Manager",
  viewer: "Viewer",
}

const ROLES = Object.keys(ROLE_LABELS) as Role[]

export type InviteFormValue = { email: string; role: Role }

export function InviteDialog({
  open,
  onOpenChange,
  onInvite,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvite: (value: InviteFormValue) => Promise<void>
}) {
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState<Role>("estimator")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [prevOpen, setPrevOpen] = React.useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setEmail("")
      setRole("estimator")
      setError(null)
    }
  }

  const isValid = /\S+@\S+\.\S+/.test(email)

  async function handleSubmit() {
    if (!isValid) return
    setSubmitting(true)
    setError(null)
    try {
      await onInvite({ email: email.trim().toLowerCase(), role })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the invite.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>
            They&apos;ll get an email to set up their account and join your org.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="invite-email">Email</FieldLabel>
            <Input
              id="invite-email"
              type="email"
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="invite-role">Role</FieldLabel>
            <Select value={role} onValueChange={(value) => setRole(value as Role)}>
              <SelectTrigger id="invite-role">
                <SelectValue>{() => ROLE_LABELS[role]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting ? "Sending…" : "Send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
