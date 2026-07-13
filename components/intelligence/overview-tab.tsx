import { FileWarning, HelpCircle } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SourceChip } from "@/components/intelligence/source-reference"

const keyFacts = [
  { label: "Working Days", value: "60" },
  { label: "Liquidated Damages", value: "$2,500/day" },
  { label: "Bid Bond", value: "10%" },
  { label: "Payment/Performance Bonds", value: "100%" },
  { label: "DBE Goal", value: "None stated" },
  { label: "Prevailing Wage", value: "Yes (CA DIR)" },
  {
    label: "Pre-Bid Meeting",
    value: "Aug 6, 2026 10:00 AM (non-mandatory)",
  },
]

const criticalDates = [
  { label: "Pre-bid", date: "Aug 6", emphasized: false },
  { label: "RFI cutoff", date: "Aug 12", emphasized: false },
  { label: "Addendum acknowledgment", date: "—", emphasized: false },
  { label: "Bid Day", date: "Aug 22 · 2:00 PM", emphasized: true },
]

const scopeItems = [
  { text: "Cold plane 2\" — 12,300 SY", sources: ["Sheet C-201"] },
  {
    text: "HMA Type A overlay — 4,850 TON",
    sources: ["Sheet C-201", "Spec 39-2"],
  },
  {
    text: "Roadway excavation — 8,450 CY",
    sources: ["Sheets C-101–C-108"],
  },
  { text: "18\" RCP storm drain — 640 LF, 12 inlets", sources: ["Sheet C-301"] },
  { text: "Curb & gutter replacement — 2,150 LF", sources: ["Sheet C-401"] },
  { text: "Thermoplastic striping — 24,500 LF", sources: ["Sheet C-601"] },
  { text: "Signage — 14 signs", sources: ["Sheet C-602"] },
  { text: "Hydroseed erosion control — 45,000 SF", sources: ["Sheet C-801"] },
]

export function OverviewTab() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed text-muted-foreground">
            Roadway rehabilitation of approximately 2.1 miles of Deschutes Road
            including cold planing, HMA overlay, localized dig-outs, drainage
            improvements (640 LF of 18-inch RCP and 12 new inlets), curb &
            gutter replacement, thermoplastic striping, and signage. Work is
            within Shasta County right-of-way with lane closures permitted 8:30
            AM–4:00 PM. Prevailing wage applies. 60 working days. One addendum
            issued (revised HMA quantity and bid date).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key Facts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {keyFacts.map((fact) => (
              <div
                key={fact.label}
                className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3"
              >
                <span className="text-xs text-muted-foreground">
                  {fact.label}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {fact.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Critical Dates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {criticalDates.map((item, index) => (
              <div
                key={item.label}
                className="flex items-center gap-3 md:flex-1"
              >
                <div
                  className={
                    item.emphasized
                      ? "flex min-h-20 w-full flex-col justify-center gap-1 rounded-lg border-2 border-primary bg-primary/5 p-3"
                      : "flex min-h-20 w-full flex-col justify-center gap-1 rounded-lg border bg-muted/30 p-3"
                  }
                >
                  <span className="text-xs text-muted-foreground">
                    {item.label}
                  </span>
                  <span
                    className={
                      item.emphasized
                        ? "text-sm font-bold text-primary"
                        : "text-sm font-medium text-foreground"
                    }
                  >
                    {item.date}
                  </span>
                </div>
                {index < criticalDates.length - 1 ? (
                  <span
                    aria-hidden
                    className="hidden shrink-0 text-muted-foreground md:block"
                  >
                    →
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Major Scope Items</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y">
            {scopeItems.map((item) => (
              <li
                key={item.text}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="text-sm text-foreground">{item.text}</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {item.sources.map((source) => (
                    <SourceChip key={source} label={source} />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <FileWarning className="size-4" />
              Addendum Impact
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="leading-relaxed text-foreground">
              Addendum 01 (Jul 28): HMA quantity revised 4,600 → 4,850 TON; bid
              date moved from Aug 15 to Aug 22.
            </p>
            <SourceChip label="Addendum_01.pdf p.2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="size-4 text-muted-foreground" />
              Missing Information
            </CardTitle>
            <CardDescription>Consider an RFI.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed text-muted-foreground">
              We could not locate: soil disposal site designation; utility
              potholing responsibility.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
