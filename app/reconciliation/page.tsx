import { getReconciliationData } from "@/app/reconciliation/actions"
import { ReconciliationShell } from "@/components/reconciliation/reconciliation-shell"
import { toReconciliationRow } from "@/lib/reconciliation-view"

export default async function ReconciliationPage() {
  const { bidRows, itemRows, estimateLineRows, project } =
    await getReconciliationData()

  const rows = itemRows
    .map((item) => {
      const bid = bidRows.find((b) => b.id === item.bidId)
      if (!bid) return null
      const estimateLine = estimateLineRows.find(
        (line) => line.id === item.estimateLineId,
      )
      return toReconciliationRow(item, bid, estimateLine)
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => Number(a.itemNumber) - Number(b.itemNumber))

  return (
    <ReconciliationShell
      projectName={
        project ? `${project.name} · #${project.number}` : "No project yet"
      }
      initialRows={rows}
    />
  )
}
