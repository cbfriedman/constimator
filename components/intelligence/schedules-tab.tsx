"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Download, FileX } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { SourceChip } from "@/components/intelligence/source-reference"
import { cn } from "@/lib/utils"

type Schedule = {
  id: string
  name: string
  meta: string
  source: string
}

const schedules: Schedule[] = [
  { id: "bid", name: "Bid Schedule", meta: "15 items", source: "Official_Bid_Form.pdf p.3–5" },
  { id: "pipe", name: "Pipe Schedule", meta: "3 runs", source: "Sheet C-301" },
  { id: "striping", name: "Striping Schedule", meta: "5 items", source: "Sheet C-601" },
  { id: "pavement", name: "Pavement Quantities", meta: "3 items", source: "Sheet C-201, Spec 39-2" },
  { id: "terms", name: "Contract Terms", meta: "6 terms", source: "Spec 00 73 00" },
  { id: "planting", name: "Planting / Landscape Schedule", meta: "Not found", source: "—" },
]

const bidItems = [
  ["1", "Mobilization", "LS", "1"],
  ["2", "Traffic Control System", "LS", "1"],
  ["3", "Clearing & Grubbing", "LS", "1"],
  ["4", "Roadway Excavation", "CY", "8,450"],
  ["5", "Class 2 Aggregate Base", "TON", "6,200"],
  ["6", "HMA Type A", "TON", "4,850"],
  ["7", "Cold Plane AC (2\")", "SY", "12,300"],
  ["8", "18\" RCP Class III", "LF", "640"],
  ["9", "Drainage Inlet (Type GO)", "EA", "12"],
  ["10", "Adjust Manhole to Grade", "EA", "9"],
  ["11", "Thermoplastic Traffic Stripe", "LF", "24,500"],
  ["12", "Pavement Marking Thermo", "SF", "1,850"],
  ["13", "Roadside Sign (One Post)", "EA", "14"],
  ["14", "Erosion Control (Hydroseed)", "SF", "45,000"],
  ["15", "Minor Concrete (Curb & Gutter)", "LF", "2,150"],
]

const pipeRuns = [
  ["SD-1", "18\" RCP CL III", "DI-1 → DI-2", "220 LF", "0.5%"],
  ["SD-2", "18\" RCP CL III", "DI-2 → EX MH", "185 LF", "0.6%"],
  ["SD-3", "18\" RCP CL III", "DI-3 → DI-4", "235 LF", "0.5%"],
]

const stripingItems = [
  ["Detail 22", "4\" Solid White Thermo", "9,800 LF"],
  ["Detail 21", "4\" Broken Yellow Thermo", "8,200 LF"],
  ["Detail 27B", "8\" Solid White (channelizing)", "4,100 LF"],
  ["Detail 38", "12\" Crosswalk / Limit Line", "2,400 LF"],
  ["—", "Pavement markings (arrows, legends)", "1,850 SF"],
]

const pavementItems: {
  item: string
  quantity: string
  note: string
  noteType: "amber" | "muted"
}[] = [
  {
    item: "Cold Plane (2\")",
    quantity: "12,300 SY",
    note: "2.5-inch at intersections per C-501 — verify",
    noteType: "amber",
  },
  {
    item: "HMA Type A Overlay",
    quantity: "4,850 TON",
    note: "Revised by Addendum 01",
    noteType: "muted",
  },
  {
    item: "Dig-out Repair (localized)",
    quantity: "380 TON",
    note: "Included in HMA per Spec 39-2.03 — verify",
    noteType: "amber",
  },
]

const contractTerms = [
  ["Working Days", "60"],
  ["Liquidated Damages", "$2,500/day"],
  ["Bonds", "10% / 100% / 100%"],
  ["Retention", "5%"],
  ["Prevailing Wage", "Yes"],
  ["DBE Goal", "None stated"],
]

export function SchedulesTab() {
  const router = useRouter()
  const [selected, setSelected] = React.useState("bid")
  const active = schedules.find((s) => s.id === selected)!

  function handleSendToEstimate() {
    if (selected === "bid") {
      toast.success("15 bid items added to Estimate Workspace")
      router.push("/estimate")
      return
    }
    toast.success(`${active.name} sent to Estimate Workspace`)
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <aside className="lg:w-72 lg:shrink-0">
        <div className="rounded-lg border bg-card">
          <div className="border-b px-3 py-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Extracted Schedules
            </h2>
          </div>
          <nav className="flex flex-col p-1.5">
            {schedules.map((schedule) => (
              <button
                key={schedule.id}
                type="button"
                onClick={() => setSelected(schedule.id)}
                className={cn(
                  "flex flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors",
                  selected === schedule.id
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "text-sm",
                    selected === schedule.id
                      ? "font-medium text-foreground"
                      : "font-normal",
                  )}
                >
                  {schedule.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {schedule.meta}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="rounded-lg border bg-card">
          <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold">{active.name}</h2>
              {selected !== "planting" ? (
                <div>
                  <SourceChip label={active.source} />
                </div>
              ) : null}
            </div>
            {selected !== "planting" ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.success("CSV downloaded")}
                >
                  <Download data-icon="inline-start" />
                  Download CSV
                </Button>
                <Button size="sm" onClick={handleSendToEstimate}>
                  Send to Estimate
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            ) : null}
          </div>

          <div className="p-1">
            {selected === "bid" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Item</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-20">Unit</TableHead>
                    <TableHead className="w-28 text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bidItems.map((row) => (
                    <TableRow key={row[0]}>
                      <TableCell className="text-muted-foreground">
                        {row[0]}
                      </TableCell>
                      <TableCell className="font-medium">{row[1]}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row[2]}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row[3]}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}

            {selected === "pipe" ? (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Run</TableHead>
                      <TableHead>Pipe</TableHead>
                      <TableHead>Segment</TableHead>
                      <TableHead className="text-right">Length</TableHead>
                      <TableHead className="w-20 text-right">Slope</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pipeRuns.map((row) => (
                      <TableRow key={row[0]}>
                        <TableCell className="font-medium">{row[0]}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {row[1]}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row[2]}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row[3]}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row[4]}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="px-4 py-3 text-xs text-muted-foreground">
                  Total 640 LF per profile stationing; see reconciliation note.
                </p>
              </div>
            ) : null}

            {selected === "striping" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Detail</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-32 text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stripingItems.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">
                        {row[0]}
                      </TableCell>
                      <TableCell className="font-medium">{row[1]}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row[2]}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}

            {selected === "pavement" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-32 text-right">Quantity</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pavementItems.map((row) => (
                    <TableRow key={row.item}>
                      <TableCell className="font-medium">{row.item}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.quantity}
                      </TableCell>
                      <TableCell>
                        {row.noteType === "amber" ? (
                          <Badge className="h-auto whitespace-normal border border-warning/30 bg-warning/10 py-1 font-normal leading-tight text-warning">
                            {row.note}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {row.note}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}

            {selected === "terms" ? (
              <Table>
                <TableBody>
                  {contractTerms.map((row) => (
                    <TableRow key={row[0]}>
                      <TableCell className="w-1/2 font-medium">
                        {row[0]}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row[1]}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}

            {selected === "planting" ? (
              <Empty className="py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileX />
                  </EmptyMedia>
                  <EmptyTitle>No schedule found</EmptyTitle>
                  <EmptyDescription>
                    No planting schedule found in this plan set.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
