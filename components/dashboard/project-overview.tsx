import Link from "next/link"
import {
  AlertTriangle,
  CheckCircle2,
  FileOutput,
  ListChecks,
  XCircle,
  type LucideIcon,
} from "lucide-react"

import type { ReconciliationSummary } from "@/lib/dashboard-summary"
import { cn } from "@/lib/utils"
import styles from "./dashboard.module.css"

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
  success: {
    text: "text-success",
    bg: "bg-success/15",
    stroke: "stroke-success",
  },
  danger: {
    text: "text-destructive",
    bg: "bg-destructive/15",
    stroke: "stroke-destructive",
  },
  warning: {
    text: "text-warning",
    bg: "bg-warning/15",
    stroke: "stroke-warning",
  },
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
    <Link href={href} className={styles.statTile}>
      <div className={styles.statHeading}>
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            TONE[tone].bg,
            TONE[tone].text
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <div
        className={cn(styles.statValue, tone !== "neutral" && TONE[tone].text)}
      >
        {value}
      </div>
      <div
        className={cn(
          "text-xs",
          tone === "neutral" ? "text-muted-foreground" : TONE[tone].text
        )}
      >
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

  const arcs = visible.map((segment, index) => {
    const length = (segment.value / total) * circumference
    const precedingTotal = visible
      .slice(0, index)
      .reduce((sum, item) => sum + item.value, 0)
    return {
      ...segment,
      dash: Math.max(length - gap, 0),
      offset: (precedingTotal / total) * circumference,
    }
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
  const { project, hasBidForm, totalItems, matched, missing, mismatched } =
    summary

  const legend = [
    {
      key: "matched",
      label: "Matched",
      value: matched,
      tone: "success" as const,
    },
    {
      key: "missing",
      label: "Missing",
      value: missing,
      tone: "danger" as const,
    },
    {
      key: "mismatched",
      label: "Mismatched",
      value: mismatched,
      tone: "warning" as const,
    },
  ]

  const breakdown = [
    { label: "Matched", value: matched, tone: "success" as const },
    {
      label: "Quantity discrepancy",
      value: summary.quantityDiscrepancies,
      tone: "warning" as const,
    },
    {
      label: "Unit mismatch",
      value: summary.unitMismatches,
      tone: "warning" as const,
    },
    { label: "Missing from estimate", value: missing, tone: "danger" as const },
    {
      label: "Lump sum — verify scope",
      value: summary.lumpSum,
      tone: "neutral" as const,
    },
  ]
  const breakdownMax = Math.max(1, ...breakdown.map((row) => row.value))

  return (
    <section
      className={styles.overview}
      aria-labelledby="project-overview-heading"
    >
      <div className={styles.projectHeader}>
        <div className={styles.projectIdentity}>
          <p className={styles.eyebrow}>
            <span />
            Project workspace{" "}
            <span className={styles.projectNumber}>#{project.number}</span>
          </p>
          <div className={styles.projectTitleRow}>
            <h1 id="project-overview-heading" className={styles.projectTitle}>
              {project.name}
            </h1>
            <span className={styles.projectStatus}>{statusLabel}</span>
          </div>
        </div>
        <Link
          className={styles.exportButton}
          href={`/reports?project=${project.id}`}
        >
          <FileOutput size={15} aria-hidden="true" />
          Export Report
        </Link>
      </div>

      <nav className={styles.projectNav} aria-label="Current project">
        <Link
          href={`/dashboard?project=${project.id}`}
          className={styles.activeTab}
          aria-current="page"
        >
          Overview
        </Link>
        <Link href={`/reconciliation?project=${project.id}`}>
          Bid Reconciliation
        </Link>
        <Link href={`/estimate?project=${project.id}`}>Line Items</Link>
        <Link href={`/upload?project=${project.id}`}>Documents</Link>
        <Link href={`/reports?project=${project.id}`}>Reports</Link>
      </nav>

      <div className={styles.statsGrid}>
        <StatTile
          icon={ListChecks}
          label="Total Items"
          value={formatCount(totalItems)}
          detail={
            hasBidForm
              ? "On the official bid form"
              : "Import the bid form to begin"
          }
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

      <div className={styles.chartsGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeading}>
            <h2>Reconciliation Summary</h2>
          </div>
          {!hasBidForm ? (
            <div className={styles.chartEmpty}>
              <ListChecks size={30} aria-hidden="true" />
              <p>
                Import your official bid form to see how every line compares
                with your estimate.
              </p>
              <Link href={`/reconciliation?project=${project.id}`}>
                Import bid form
              </Link>
            </div>
          ) : (
            <div className={styles.donutLayout}>
              <Donut segments={legend} total={totalItems} />
              <ul className={styles.legend}>
                {legend.map((row) => (
                  <li key={row.key}>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-2.5 rounded-sm",
                        row.tone === "success" && "bg-success",
                        row.tone === "danger" && "bg-destructive",
                        row.tone === "warning" && "bg-warning"
                      )}
                    />
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className={styles.legendValue}>
                      {formatCount(row.value)}{" "}
                      <span className={styles.legendPercent}>
                        ({pct(row.value, totalItems)})
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeading}>
            <h2>Items by Status</h2>
            <Link
              href={`/reconciliation?project=${project.id}`}
              className="text-xs font-medium text-glow underline-offset-4 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className={styles.breakdown}>
            {breakdown.map((row) => (
              <div key={row.label} className={styles.breakdownRow}>
                <span>{row.label}</span>
                <span className={styles.breakdownCount}>
                  {formatCount(row.value)}
                </span>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${(row.value / breakdownMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
