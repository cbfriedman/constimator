"use client"

import { useMemo, useState } from "react"
import { Check, Layers, Gauge, FileStack, Globe, RotateCcw } from "lucide-react"

type Trade = {
  id: string
  name: string
  sheets: number
  accuracy: number
  selfPerform: boolean
}

const INITIAL_TRADES: Trade[] = [
  { id: "earthwork", name: "Earthwork & grading", sheets: 8, accuracy: 94, selfPerform: true },
  { id: "concrete", name: "Concrete & structures", sheets: 12, accuracy: 91, selfPerform: true },
  { id: "paving", name: "Paving & surfacing", sheets: 6, accuracy: 93, selfPerform: true },
  { id: "utilities", name: "Wet & dry utilities", sheets: 10, accuracy: 88, selfPerform: false },
  { id: "landscape", name: "Landscape & erosion", sheets: 5, accuracy: 90, selfPerform: false },
  { id: "electrical", name: "Electrical & signals", sheets: 7, accuracy: 86, selfPerform: false },
]

const REVIEW_RATE = 12

export function TradeSelector() {
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(INITIAL_TRADES.map((t) => [t.id, t.selfPerform])),
  )

  const toggle = (id: string) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  const reset = () => setSelected(Object.fromEntries(INITIAL_TRADES.map((t) => [t.id, t.selfPerform])))

  const summary = useMemo(() => {
    const chosen = INITIAL_TRADES.filter((t) => selected[t.id])
    const sheets = chosen.reduce((sum, t) => sum + t.sheets, 0)
    // Blended accuracy weighted by sheet count
    const weighted = chosen.reduce((sum, t) => sum + t.accuracy * t.sheets, 0)
    const accuracy = sheets > 0 ? Math.round(weighted / sheets) : 0
    return { count: chosen.length, sheets, accuracy, cost: sheets * REVIEW_RATE }
  }, [selected])

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" aria-hidden="true" />
          <h3 className="font-display text-lg font-semibold">Build your takeoff scope</h3>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset
        </button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Select the trades you want Constimator to take off. Totals, blended accuracy, and manual-review cost
        update as you go.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Trade list */}
        <ul className="flex flex-col gap-2.5">
          {INITIAL_TRADES.map((trade) => {
            const isOn = selected[trade.id]
            return (
              <li key={trade.id}>
                <button
                  type="button"
                  onClick={() => toggle(trade.id)}
                  aria-pressed={isOn}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    isOn ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted/60"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      isOn ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                    }`}
                  >
                    {isOn ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{trade.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {trade.sheets} sheets &middot; {trade.accuracy}% est. accuracy
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {/* Live summary */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/40 p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                Trades
              </div>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
                {summary.count}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <FileStack className="h-3.5 w-3.5" aria-hidden="true" />
                Sheets
              </div>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
                {summary.sheets}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                Blended accuracy
              </span>
              <span className="font-semibold tabular-nums text-foreground">{summary.accuracy}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${summary.accuracy}%` }}
              />
            </div>
          </div>

          <div className="mt-1 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              Constimator manual review
            </div>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="font-display text-3xl font-bold tabular-nums text-foreground">
                {summary.cost > 0 ? `$${summary.cost.toLocaleString()}` : "$0"}
              </span>
              <span className="text-xs text-muted-foreground">
                {summary.sheets} sheets &times; ${REVIEW_RATE}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Verified within 3 business days.</p>
          </div>

          <a
            href="#"
            aria-disabled={summary.sheets === 0}
            className={`inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold transition-transform ${
              summary.sheets === 0
                ? "pointer-events-none bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground shadow-sm hover:-translate-y-0.5"
            }`}
          >
            {summary.sheets === 0 ? "Select at least one trade" : "Run this takeoff"}
          </a>
        </div>
      </div>
    </div>
  )
}
