"use client"

import * as React from "react"
import { toast } from "sonner"

import {
  updateOrgNameAction,
  updateProfileAction,
  updateSpendCapAction,
} from "@/app/settings/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { DeleteOrgCard } from "@/components/settings/delete-org-card"
import { ProjectHeader } from "@/components/project-header"

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  estimator: "Estimator",
  pm: "Project Manager",
  viewer: "Viewer",
}

export function SettingsShell({
  org,
  user,
  isAdmin,
}: {
  org: { name: string; aiMonthlySpendCapUsd: string }
  user: { fullName: string; email: string; role: string }
  isAdmin: boolean
}) {
  const [orgName, setOrgName] = React.useState(org.name)
  const [spendCap, setSpendCap] = React.useState(org.aiMonthlySpendCapUsd)
  const [fullName, setFullName] = React.useState(user.fullName)
  const [savingOrg, setSavingOrg] = React.useState(false)
  const [savingProfile, setSavingProfile] = React.useState(false)

  async function handleSaveOrg(event: React.FormEvent) {
    event.preventDefault()
    setSavingOrg(true)
    try {
      await Promise.all([
        updateOrgNameAction(orgName),
        updateSpendCapAction(Number(spendCap)),
      ])
      toast.success("Company settings saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save — try again.")
    } finally {
      setSavingOrg(false)
    }
  }

  async function handleSaveProfile(event: React.FormEvent) {
    event.preventDefault()
    setSavingProfile(true)
    try {
      await updateProfileAction(fullName)
      toast.success("Profile saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save — try again.")
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-8">
      <ProjectHeader title="Settings" subtitle="Manage your company and profile." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company</CardTitle>
          <CardDescription>
            {isAdmin
              ? "Visible to your whole team."
              : "Only an org admin can make changes here."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveOrg}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="org-name">Company name</FieldLabel>
                <Input
                  id="org-name"
                  value={orgName}
                  disabled={!isAdmin}
                  onChange={(event) => setOrgName(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="spend-cap">Monthly AI usage limit</FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="spend-cap"
                    type="number"
                    min="1"
                    step="1"
                    className="pl-6"
                    value={spendCap}
                    disabled={!isAdmin}
                    onChange={(event) => setSpendCap(event.target.value)}
                  />
                </div>
                <FieldDescription>
                  AI document processing pauses for the rest of the month once
                  your org crosses this amount.
                </FieldDescription>
              </Field>
              {isAdmin ? (
                <Field>
                  <Button type="submit" disabled={savingOrg} className="w-fit">
                    {savingOrg ? "Saving…" : "Save company settings"}
                  </Button>
                </Field>
              ) : null}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="full-name">Name</FieldLabel>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" value={user.email} disabled />
                <FieldDescription>
                  Contact support to change the email on your account.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Role</FieldLabel>
                <Input value={ROLE_LABELS[user.role] ?? user.role} disabled />
              </Field>
              <Field>
                <Button type="submit" disabled={savingProfile} className="w-fit">
                  {savingProfile ? "Saving…" : "Save profile"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {/* Admin-only: deleting the company removes every member's data, not
          just the person clicking. Same requireAdmin check on the server. */}
      {isAdmin ? <DeleteOrgCard orgName={org.name} /> : null}
    </div>
  )
}
