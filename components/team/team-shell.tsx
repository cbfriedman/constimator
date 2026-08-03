"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { inviteTeammateAction, revokeInviteAction } from "@/app/team/actions"
import {
  InviteDialog,
  ROLE_LABELS,
  type InviteFormValue,
} from "@/components/team/invite-dialog"
import { ProjectHeader } from "@/components/project-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { invites, users } from "@/db/schema"

type UserRow = typeof users.$inferSelect
type InviteRow = typeof invites.$inferSelect

export function TeamShell({
  members: initialMembers,
  pendingInvites: initialPendingInvites,
  currentUserId,
  isAdmin,
}: {
  members: UserRow[]
  pendingInvites: InviteRow[]
  currentUserId: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [pendingInvites, setPendingInvites] = useState(initialPendingInvites)
  const [prevMembers, setPrevMembers] = useState(initialMembers)
  const [prevPendingInvites, setPrevPendingInvites] = useState(initialPendingInvites)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Server props change after router.refresh() — same render-time sync
  // pattern used throughout this app (e.g. reconciliation-shell.tsx).
  if (initialMembers !== prevMembers) {
    setPrevMembers(initialMembers)
    setMembers(initialMembers)
  }
  if (initialPendingInvites !== prevPendingInvites) {
    setPrevPendingInvites(initialPendingInvites)
    setPendingInvites(initialPendingInvites)
  }

  async function handleInvite(value: InviteFormValue) {
    await inviteTeammateAction(value)
    toast.success(`Invited ${value.email}`)
    router.refresh()
  }

  function handleRevoke(id: string, email: string) {
    setPendingInvites((prev) => prev.filter((invite) => invite.id !== id))
    revokeInviteAction(id)
      .then(() => {
        toast(`Revoked invite to ${email}`)
        router.refresh()
      })
      .catch(() => toast.error("Couldn't revoke that invite — try again."))
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
      <ProjectHeader
        title="Team"
        subtitle={`${members.length} member${members.length === 1 ? "" : "s"}`}
        actions={
          isAdmin ? (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <UserPlus data-icon="inline-start" />
              Invite Teammate
            </Button>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.fullName ?? "—"}
                    {member.id === currentUserId ? (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ROLE_LABELS[member.role]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isAdmin && pendingInvites.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending invites</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-0">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        <Mail className="size-4 text-muted-foreground" />
                        {invite.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ROLE_LABELS[invite.role]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(invite.id, invite.email)}
                      >
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <InviteDialog open={dialogOpen} onOpenChange={setDialogOpen} onInvite={handleInvite} />
    </div>
  )
}
