import { getEstimateData } from "@/app/estimate/actions"
import { getReconciliationData } from "@/app/reconciliation/actions"
import { ReportsShell } from "@/components/reports/reports-shell"
import { getScopedDb } from "@/lib/db/scoped"
import { sumLineMarkup, sumLineTotals, toEstimateLineView } from "@/lib/estimate-view"
import { toReconciliationRow } from "@/lib/reconciliation-view"

function formatWholeCurrency(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default async function ReportsPage() {
  const scopedDb = await getScopedDb()
  const org = await scopedDb.org.get()
  const { rows: estimateLineRows, project } = await getEstimateData()
  const { bidRows, itemRows, estimateLineRows: allEstimateLines } =
    await getReconciliationData()

  const reconciliationRows = itemRows
    .map((item) => {
      const bid = bidRows.find((b) => b.id === item.bidId)
      if (!bid) return null
      const estimateLine = allEstimateLines.find((l) => l.id === item.estimateLineId)
      return toReconciliationRow(item, bid, estimateLine)
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => Number(a.itemNumber) - Number(b.itemNumber))

  const subtotal = sumLineTotals(estimateLineRows)
  const markup = sumLineMarkup(estimateLineRows)
  const bidTotal = subtotal + markup
  const reviewedCount = estimateLineRows.filter((r) => r.source === "reviewed").length
  const overriddenCount = estimateLineRows.filter(
    (r) => r.source === "overridden",
  ).length

  return (
    <ReportsShell
      context={{
        orgName: org?.name ?? "Your company",
        projectName: project?.name ?? "No project yet",
        projectNumber: project?.number ?? "—",
        bidDate: project?.bidDate
          ? formatDate(new Date(`${project.bidDate}T00:00:00`))
          : "—",
        preparedDate: formatDate(new Date()),
      }}
      estimateRows={estimateLineRows.map(toEstimateLineView)}
      reconciliationRows={reconciliationRows}
      subtotal={formatWholeCurrency(subtotal)}
      markup={formatWholeCurrency(markup)}
      bidTotal={formatWholeCurrency(bidTotal)}
      reviewedCount={reviewedCount}
      overriddenCount={overriddenCount}
    />
  )
}
