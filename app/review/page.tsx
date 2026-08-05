import { getReviewData } from "@/app/review/actions"
import { NoProjectState } from "@/components/no-project-state"
import { ReviewShell } from "@/components/review/review-shell"

export default async function ReviewPage() {
  const { project, latestRequest } = await getReviewData()

  if (!project) {
    return (
      <NoProjectState
        title="No project yet"
        description="Create a project before requesting a review."
      />
    )
  }

  return (
    <ReviewShell
      project={project}
      initialRequest={
        latestRequest
          ? {
              scope: latestRequest.scope,
              notes: latestRequest.notes,
              status: latestRequest.status,
              createdAt: latestRequest.createdAt,
            }
          : null
      }
    />
  )
}
