import { getTeamData } from "@/app/team/actions"
import { TeamShell } from "@/components/team/team-shell"

export default async function TeamPage() {
  const { members, pendingInvites, currentUserId, isAdmin } = await getTeamData()

  return (
    <TeamShell
      members={members}
      pendingInvites={pendingInvites}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
    />
  )
}
