import { getEstimateData } from "@/app/estimate/actions"
import { EstimateShell } from "@/components/estimate/estimate-shell"
import { sumLineTotals, toEstimateLineView } from "@/lib/estimate-view"

function formatWholeCurrency(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`
}

export default async function EstimatePage() {
  const { rows: lineRows, project } = await getEstimateData()

  const subtotal = sumLineTotals(lineRows)
  const markup = subtotal * 0.1
  const bidTotal = subtotal + markup
  const engineersEstimate = project?.engineersEstimate
    ? Number(project.engineersEstimate)
    : null
  const vsEngineersEstimatePct = engineersEstimate
    ? ((bidTotal - engineersEstimate) / engineersEstimate) * 100
    : null

  return (
    <EstimateShell
      projectName={project?.name ?? "No project yet"}
      rows={lineRows.map(toEstimateLineView)}
      subtotal={formatWholeCurrency(subtotal)}
      markup={formatWholeCurrency(markup)}
      bidTotal={formatWholeCurrency(bidTotal)}
      vsEngineersEstimatePct={vsEngineersEstimatePct}
    />
  )
}
