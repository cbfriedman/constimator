"use client"

import { useRouter } from "next/navigation"
import { AlertTriangle, Plus, TableProperties } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { BidCountdownBadge } from "@/components/bid-countdown-badge"
import { Button } from "@/components/ui/button"
import { useProjectState } from "@/components/project-state-provider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { EstimateTable } from "@/components/estimate/estimate-table"
import { demoProject } from "@/lib/demo-data"

const totals = [
  { label: "Subtotal", value: "$1,742,350" },
  { label: "Markup (10%)", value: "$174,235" },
  { label: "Bid Total", value: "$1,916,585", emphasized: true },
]

const markupLabels: Record<string, string> = {
  "10": "Markup: 10% (all items)",
  "12": "Markup: 12% (all items)",
  "15": "Markup: 15% (all items)",
  custom: "Markup: Custom per item",
}

const filterLabels: Record<string, string> = {
  all: "Filter: All statuses",
  official: "Filter: Official",
  reviewed: "Filter: Reviewed",
  manual: "Filter: Manual",
  overridden: "Filter: Overridden",
}

export default function EstimatePage() {
  const router = useRouter()
  const { costSetupComplete } = useProjectState()

  return (
    <div className="flex flex-col">
      {!costSetupComplete ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-warning/40 bg-warning/10 px-6 py-3">
          <AlertTriangle className="size-4 shrink-0 text-warning" />
          <p className="flex-1 text-sm text-foreground">
            <span className="font-medium">
              2 cost settings are missing
            </span>{" "}
            (Cement Mason labor rate, Water Truck rate, Insurance %). Totals
            shown are preliminary.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-warning/40 bg-warning/10 text-warning hover:bg-warning/20"
            onClick={() => router.push("/cost-setup")}
          >
            Complete Cost Setup
          </Button>
        </div>
      ) : null}
      <div className="flex flex-col gap-4 border-b bg-card px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Estimate Workspace
              </h1>
              <BidCountdownBadge />
            </div>
            <p className="text-sm text-muted-foreground">{demoProject.name}</p>
          </div>
          <div className="flex items-center gap-4">
            {totals.map((item) => (
              <div key={item.label} className="flex flex-col items-end">
                <span className="text-xs text-muted-foreground">
                  {item.label}
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className={
                      item.emphasized
                        ? "text-lg font-bold text-foreground tabular-nums"
                        : "text-sm font-medium text-foreground tabular-nums"
                    }
                  >
                    {item.value}
                  </span>
                  {item.emphasized && !costSetupComplete ? (
                    <Badge
                      variant="outline"
                      className="border-warning/40 bg-warning/10 text-warning"
                    >
                      Preliminary
                    </Badge>
                  ) : null}
                </span>
              </div>
            ))}
            <Separator orientation="vertical" className="h-10" />
            <Badge
              variant="outline"
              className="border-warning/40 bg-warning/10 text-warning"
            >
              vs. Engineer&apos;s Estimate: +3.6%
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            <Plus data-icon="inline-start" />
            Add Bid Item
          </Button>
          <Button variant="outline" size="sm">
            <TableProperties data-icon="inline-start" />
            Import from Bid Schedule
          </Button>
          <Select defaultValue="10">
            <SelectTrigger size="sm" className="w-52">
              <SelectValue>{(value) => markupLabels[value as string]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">Markup: 10% (all items)</SelectItem>
              <SelectItem value="12">Markup: 12% (all items)</SelectItem>
              <SelectItem value="15">Markup: 15% (all items)</SelectItem>
              <SelectItem value="custom">Markup: Custom per item</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger size="sm" className="w-48">
              <SelectValue>{(value) => filterLabels[value as string]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Filter: All statuses</SelectItem>
              <SelectItem value="official">Filter: Official</SelectItem>
              <SelectItem value="reviewed">Filter: Reviewed</SelectItem>
              <SelectItem value="manual">Filter: Manual</SelectItem>
              <SelectItem value="overridden">Filter: Overridden</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="ml-auto"
            onClick={() => router.push("/reconciliation")}
          >
            Reconcile Against Bid Form
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-6">
        <EstimateTable />
        <p className="text-right text-xs text-muted-foreground">
          All changes saved
        </p>
      </div>
    </div>
  )
}
