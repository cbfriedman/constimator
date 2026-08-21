import {
  getTradeComparison,
  listTradesForComparison,
} from "@/app/sub-quotes/actions"
import { NoProjectState } from "@/components/no-project-state"
import { ComparisonGridView } from "@/components/sub-quotes/comparison-grid"
import { getCurrentProject } from "@/lib/current-project"
import { getScopedDb } from "@/lib/db/scoped"

export default async function CompareSubQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ trade?: string }>
}) {
  const scopedDb = await getScopedDb()
  const project = await getCurrentProject(scopedDb)

  if (!project) {
    return (
      <NoProjectState
        title="No project yet"
        description="Create a project and upload subcontractor quotes to compare them here."
      />
    )
  }

  const trades = await listTradesForComparison(project.id)

  if (trades.length === 0) {
    return (
      <NoProjectState
        title="No sub quotes yet"
        description="Upload subcontractor quotes under Upload Documents, then compare them side by side here."
      />
    )
  }

  // listTradesForComparison puts the most-quoted trade first, which is the one
  // with the most to level.
  const { trade: requestedTrade } = await searchParams
  const trade = trades.some((entry) => entry.trade === requestedTrade)
    ? (requestedTrade as string)
    : trades[0].trade

  const [grid, org] = await Promise.all([
    getTradeComparison(project.id, trade),
    scopedDb.org.get(),
  ])

  return (
    <ComparisonGridView
      projectName={project.name}
      projectNumber={project.number}
      orgName={org?.name ?? ""}
      trades={trades}
      grid={grid}
    />
  )
}
