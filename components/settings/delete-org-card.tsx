"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { deleteOrgAction } from "@/app/settings/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { createClient } from "@/lib/supabase/client"

// Closes the "self-service deletion in-app" open item in
// docs/DATA-RETENTION.md. Until this existed, leaving meant emailing
// support and waiting up to 30 days for someone to delete your bid history
// by hand.
export function DeleteOrgCard({ orgName }: { orgName: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [confirmation, setConfirmation] = React.useState("")
  const [deleting, setDeleting] = React.useState(false)

  const canDelete = confirmation.trim().toLowerCase() === orgName.trim().toLowerCase()

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteOrgAction(confirmation)
      // The server has already deleted this user's auth account, so the
      // session cookie is now pointing at nothing. Clear it client-side too
      // rather than letting the next request fail its way to /sign-in.
      await createClient().auth.signOut()
      router.replace("/sign-in?deleted=1")
    } catch (error) {
      setDeleting(false)
      toast.error(error instanceof Error ? error.message : "Could not delete the account.")
    }
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base text-destructive">Delete this company</CardTitle>
        <CardDescription>
          Permanently deletes your company account — every project, uploaded
          document, estimate, and reconciliation, for every member of your team.
          This cannot be undone, and we cannot recover it for you afterwards.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          If you have an active subscription, cancel it under Billing first —
          deleting your account here does not cancel Stripe billing on its own.
        </p>
        <div>
          <Button variant="destructive" onClick={() => setOpen(true)}>
            Delete company account
          </Button>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {orgName}?</DialogTitle>
            <DialogDescription>
              This deletes every project, document, estimate, and reconciliation
              belonging to {orgName}, and removes every team member&apos;s access.
              It cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="delete-confirmation">
              Type <span className="font-medium text-foreground">{orgName}</span> to confirm
            </FieldLabel>
            <Input
              id="delete-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              placeholder={orgName}
            />
          </Field>

          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button variant="destructive" disabled={!canDelete || deleting} onClick={handleDelete}>
              {deleting ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
