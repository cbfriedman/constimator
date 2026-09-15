import Link from "next/link"
import {
  AlertTriangle,
  CheckCircle2,
  FileOutput,
  ListChecks,
  XCircle,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ReconciliationSummary } from "@/lib/dashboard-summary"
import { cn } from "@/lib/utils"

// The project overview block at the top of /dashboard (Sep 2026 visual
// design): project header, four stat tiles, a reconciliation donut with its
// legend, and a status breakdown. All numbers come from
// lib/dashboard-summary.ts, i.e. the same diff /reconciliation renders.
//
// Chart conventions (dataviz skill): the donut is a STATUS chart, so it uses
// the theme's reserved success / warning / destructive tokens — never the
// categorical ramp — and each state is also carried by an icon and a label in
// the tiles and the legend, so colour is never the only encoding. Segments
// are separated by a 2px surface gap. The legend doubles as the table view.

function pct(part: number, total: number): string {
  if (total === 0) return "0%"
  return `${((part / total) * 100).toFixed(1)}%`
}

function formatCount(n: number): string {
  return n.toLocaleString("en-US")
}

type Tone = "neutral" | "success" | "danger" | "warning"

const TONE = {
  neutral: { text: "text-glow", bg: "bg-glow/15", stroke: "stroke-glow" },
  success: { text: "text-success", bg: "bg-success/15", stroke: "stroke-success" },
  danger: { text: "text-destructive", bg: "bg-destructive/15", stroke: "stroke-destructive" },
  warning: { text: "text-warning", bg: "bg-warning/15", stroke: "stroke-warning" },
} satisfies Record<Tone, { text: string; bg: string; stroke: string }>

function StatTile({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  href,
}: {
  icon: LucideIcon
  label: string
  value: string
  detail: string
  tone: Tone
  href: string
}) {
  return (
    <Link
      href={href}
      className="glow-panel flex flex-col gap-3 rounded-2xl bg-card/80 p-5 transition-colors hover:bg-card"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            TONE[tone].bg,
            TONE[tone].text,
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <div className="text-3xl font-semibold tabular-nums tracking-tight">{value}</div>
      <div className={cn("text-xs", tone === "neutral" ? "text-muted-foreground" : TONE[tone].text)}>
        {detail}
      </div>
    </Link>
  )
}

// Segments drawn with stroke-dasharray on a single circle. A 2px gap is
// left between adjacent segments by shortening each dash — the surface shows
// through, which is the dataviz spacer rule for adjacent fills.
function Donut({
  segments,
  total,
}: {
  segments: { key: string; value: number; tone: Tone }[]
  total: number
}) {
  const size = 168
  const strokeWidth = 18
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const gapPx = 2
  const visible = segments.filter((s) => s.value > 0)
  // One segment needs no gap (it would cut a notch into a full ring).
  const gap = visible.length > 1 ? gapPx : 0

  let offset = 0
  const arcs = visible.map((segment) => {
    const length = (segment.value / total) * circumference
    const arc = {
      ...segment,
      dash: Math.max(length - gap, 0),
      offset,
    }
    offset += length
    return arc
  })

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Reconciliation summary: ${total} bid items`}
      className="shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="stroke-muted"
        strokeWidth={strokeWidth}
      />
      {/* rotate(-90) starts the first segment at 12 o'clock. */}
      {arcs.map((arc) => (
        <circle
          key={arc.key}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={TONE[arc.tone].stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
          strokeDashoffset={-arc.offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ))}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground text-2xl font-semibold tabular-nums"
        dy="-0.35em"
      >
        {formatCount(total)}
      </text>
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-muted-foreground text-[11px]"
        dy="1.1em"
      >
        Total Items
      </text>
    </svg>
  )
}

export function ProjectOverview({
  summary,
  statusLabel,
}: {
  summary: ReconciliationSummary
  statusLabel: string
}) {
  const { project, hasBidForm, totalItems, matched, missing, mismatched } = summary

  const legend = [
    { key: "matched", label: "Matched", value: matched, tone: "success" as const },
    { key: "missing", label: "Missing", value: missing, tone: "danger" as const },
    { key: "mismatched", label: "Mismatched", value: mismatched, tone: "warning" as const },
  ]

  const breakdown = [
    { label: "Matched", value: matched, tone: "success" as const },
    { label: "Quantity discrepancy", value: summary.quantityDiscrepancies, tone: "warning" as const },
    { label: "Unit mismatch", value: summary.unitMismatches, tone: "warning" as const },
    { label: "Missing from estimate", value: missing, tone: "danger" as const },
    { label: "Lump sum — verify scope", value: summary.lumpSum, tone: "neutral" as const },
  ]
  const breakdownMax = Math.max(1, ...breakdown.map((row) => row.value))

  return (
    <section className="flex flex-col gap-5" aria-labelledby="project-overview-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2
              id="project-overview-heading"
              className="text-xl font-semibold tracking-tight"
            >
              {project.name}
            </h2>
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
              {statusLabel}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">#{project.number}</p>
        </div>
        <Button
          variant="outline"
          render={<Link href={`/reports?project=${project.id}`} />}
        >
          <FileOutput data-icon="inline-start" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={ListChecks}
          label="Total Items"
          value={formatCount(totalItems)}
          detail={hasBidForm ? "On the official bid form" : "Import the bid form to begin"}
          tone="neutral"
          href={`/reconciliation?project=${project.id}`}
        />
        <StatTile
          icon={CheckCircle2}
          label="Matched Items"
          value={formatCount(matched)}
          detail={pct(matched, totalItems)}
          tone="success"
          href={`/reconciliation?project=${project.id}`}
        />
        <StatTile
          icon={XCircle}
          label="Missing Items"
          value={formatCount(missing)}
          detail={pct(missing, totalItems)}
          tone="danger"
          href={`/reconciliation?project=${project.id}`}
        />
        <StatTile
          icon={AlertTriangle}
          label="Mismatched Items"
          value={formatCount(mismatched)}
          detail={pct(mismatched, totalItems)}
          tone="warning"
          href={`/reconciliation?project=${project.id}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="glow-panel bg-card/80">
          <CardHeader>
            <CardTitle>Reconciliation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasBidForm ? (
              <p className="text-sm text-muted-foreground">
                No official bid form imported yet. Upload it and Constimator
                will reconcile your estimate against every line.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-8">
                <Donut segments={legend} total={totalItems} />
                <ul className="flex flex-col gap-3 text-sm">
                  {legend.map((row) => (
                    <li key={row.key} className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-2.5 rounded-sm",
                          row.tone === "success" && "bg-success",
                          row.tone === "danger" && "bg-destructive",
                          row.tone === "warning" && "bg-warning",
                        )}
                      />
                      <span className="w-24 text-muted-foreground">{row.label}</span>
                      <span className="tabular-nums">
                        {formatCount(row.value)}{" "}
                        <span className="text-muted-foreground">
                          ({pct(row.value, totalItems)})
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glow-panel bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Items by Status</CardTitle>
            <Link
              href={`/reconciliation?project=${project.id}`}
              className="text-xs font-medium text-glow underline-offset-4 hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {breakdown.map((row) => (
              <div key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className="text-sm tabular-nums">{formatCount(row.value)}</span>
                <div className="col-span-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      row.tone === "success" && "bg-success",
                      row.tone === "danger" && "bg-destructive",
                      row.tone === "warning" && "bg-warning",
                      row.tone === "neutral" && "bg-glow",
                    )}
                    style={{ width: `${(row.value / breakdownMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
