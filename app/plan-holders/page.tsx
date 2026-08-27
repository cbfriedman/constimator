import {
  getPlanHolderReview,
  listPlanHolderListsForReview,
} from "@/app/plan-holders/actions"
import { NoProjectState } from "@/components/no-project-state"
import { ReviewShell } from "@/components/plan-holders/review-shell"
import { getCurrentProject } from "@/lib/current-project"
import { getScopedDb } from "@/lib/db/scoped"

export default async function PlanHoldersPage({
  searchParams,
}: {
  searchParams: Promise<{ list?: string }>
}) {
  const scopedDb = await getScopedDb()
  const project = await getCurrentProject(scopedDb)

  if (!project) {
    return (
      <NoProjectState
        title="No project yet"
        description="Create a project and upload a plan holders list to review it here."
      />
    )
  }

  const lists = await listPlanHolderListsForReview(project.id)

  if (lists.length === 0) {
    return (
      <NoProjectState
        title="No plan holders list yet"
        description="Upload the roster an agency published for this job and it will appear here once it has been read."
      />
    )
  }

  // listPlanHolderListsForReview already sorts the list needing the most
  // attention first, so that is the sensible default when none is named in
  // the URL.
  const { list: requestedId } = await searchParams
  const selectedId = lists.some((list) => list.id === requestedId)
    ? (requestedId as string)
    : lists[0].id

  const review = await getPlanHolderReview(selectedId)

  return (
    <ReviewShell projectName={project.name} lists={lists} review={review} />
  )
}
