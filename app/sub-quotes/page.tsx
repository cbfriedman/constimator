import {
  getSubQuoteReview,
  listSubQuotesForReview,
} from "@/app/sub-quotes/actions"
import { NoProjectState } from "@/components/no-project-state"
import { ReviewShell } from "@/components/sub-quotes/review-shell"
import { getCurrentProject } from "@/lib/current-project"
import { getScopedDb } from "@/lib/db/scoped"

export default async function SubQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ quote?: string }>
}) {
  const scopedDb = await getScopedDb()
  const project = await getCurrentProject(scopedDb)

  if (!project) {
    return (
      <NoProjectState
        title="No project yet"
        description="Create a project and upload a subcontractor quote to review it here."
      />
    )
  }

  const quotes = await listSubQuotesForReview(project.id)

  if (quotes.length === 0) {
    return (
      <NoProjectState
        title="No sub quotes yet"
        description="Upload a subcontractor quote under Upload Sub Quotes and it will appear here once it has been read."
      />
    )
  }

  // listSubQuotesForReview already sorts the quote needing the most attention
  // first, so that is the sensible default when none is named in the URL.
  const { quote: requestedId } = await searchParams
  const selectedId = quotes.some((quote) => quote.id === requestedId)
    ? (requestedId as string)
    : quotes[0].id

  const review = await getSubQuoteReview(selectedId)

  return <ReviewShell projectName={project.name} quotes={quotes} review={review} />
}
