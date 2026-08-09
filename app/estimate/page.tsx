import { getEstimateData } from "@/app/estimate/actions"
import { EstimateShell } from "@/components/estimate/estimate-shell"
import { sumLineMarkup, sumLineTotals, toEstimateLineView } from "@/lib/estimate-view"

function formatWholeCurrency(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`
}

export default async function EstimatePage() {
  const { rows: lineRows, project } = await getEstimateData()

  const subtotal = sumLineTotals(lineRows)
  const markup = sumLineMarkup(lineRows)
  const bidTotal = subtotal + markup
  // Blended rate across every line — lines can carry different markupPct
  // values, so there's no single "the" percentage unless every line
  // happens to match; this is what actually reconciles to the dollar
  // figure shown, instead of a hardcoded number that could silently drift
  // from it.
  const markupPct = subtotal > 0 ? (markup / subtotal) * 100 : 0
  const engineersEstimate = project?.engineersEstimate
    ? Number(project.engineersEstimate)
    : null
  const vsEngineersEstimatePct = engineersEstimate
    ? ((bidTotal - engineersEstimate) / engineersEstimate) * 100
    : null

  return (
    <EstimateShell
      projectId={project?.id ?? ""}
      projectName={project?.name ?? "No project yet"}
      rows={lineRows.map(toEstimateLineView)}
      subtotal={formatWholeCurrency(subtotal)}
      markup={formatWholeCurrency(markup)}
      markupPct={markupPct}
      bidTotal={formatWholeCurrency(bidTotal)}
      vsEngineersEstimatePct={vsEngineersEstimatePct}
    />
  )
}
