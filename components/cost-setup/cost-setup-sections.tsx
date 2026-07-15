"use client"

import * as React from "react"
import { AlertTriangle, Plus } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { SourceBadge } from "@/components/source-badge"
import {
  cementMasonRate,
  costSetupSections,
  crewCards,
  equipmentRates,
  laborRates,
  productionRows,
  waterTruckRate,
} from "@/lib/cost-setup-data"
import { cn } from "@/lib/utils"

function RateMissingBadge() {
  return (
    <Badge
      variant="outline"
      className="gap-1 border-warning/60 bg-warning/10 font-medium text-warning"
    >
      <AlertTriangle className="size-3" />
      Rate missing
    </Badge>
  )
}

function ComingSoonBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
      aria-disabled="true"
    >
      <span className="size-1.5 rounded-full bg-muted-foreground/50" />
      {children}
    </div>
  )
}

function SectionShell({
  id,
  index,
  title,
  description,
  registerRef,
  children,
}: {
  id: string
  index: number
  title: string
  description?: string
  registerRef: (id: string, el: HTMLElement | null) => void
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      ref={(el) => registerRef(id, el)}
      className="scroll-mt-6"
      aria-labelledby={`${id}-heading`}
    >
      <Card>
        <CardHeader>
          <CardTitle id={`${id}-heading`} className="flex items-center gap-2">
            <span className="text-sm tabular-nums text-muted-foreground">
              {index}.
            </span>
            {title}
          </CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </section>
  )
}

export function CostSetupSections({
  complete,
  registerRef,
}: {
  complete: boolean
  registerRef: (id: string, el: HTMLElement | null) => void
}) {
  const s = costSetupSections

  return (
    <div className="flex flex-col gap-6">
      {/* 1. LABOR RATES */}
      <SectionShell
        id={s[0].id}
        index={1}
        title="Labor Rates"
        registerRef={registerRef}
      >
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Classification</TableHead>
                <TableHead className="text-right">Base Rate</TableHead>
                <TableHead className="text-right">Fringe</TableHead>
                <TableHead className="text-right">Total /hr</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {laborRates.map((row) => (
                <TableRow key={row.classification}>
                  <TableCell className="font-medium">
                    {row.classification}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.base}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.fringe}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {row.total}
                  </TableCell>
                  <TableCell>
                    <SourceBadge kind="manual" />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className={cn(!complete && "bg-warning/5")}>
                <TableCell className="font-medium">
                  {cementMasonRate.classification}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {complete ? cementMasonRate.base : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {complete ? cementMasonRate.fringe : "—"}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {complete ? cementMasonRate.total : "—"}
                </TableCell>
                <TableCell>
                  {complete ? <SourceBadge kind="manual" /> : <RateMissingBadge />}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <Button variant="outline" size="sm" className="w-fit">
            <Plus data-icon="inline-start" />
            Add Classification
          </Button>
          <ComingSoonBanner>
            Prevailing wage database sync — Coming soon
          </ComingSoonBanner>
        </div>
      </SectionShell>

      {/* 2. EQUIPMENT RATES */}
      <SectionShell
        id={s[1].id}
        index={2}
        title="Equipment Rates"
        registerRef={registerRef}
      >
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Owned/Rental</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipmentRates.map((row) => (
                <TableRow key={row.equipment}>
                  <TableCell className="font-medium">{row.equipment}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.rate}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.unit}
                  </TableCell>
                  <TableCell>{row.ownership}</TableCell>
                  <TableCell>
                    <SourceBadge kind="manual" />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className={cn(!complete && "bg-warning/5")}>
                <TableCell className="font-medium">
                  {waterTruckRate.equipment}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {complete ? waterTruckRate.rate : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {waterTruckRate.unit}
                </TableCell>
                <TableCell>{waterTruckRate.ownership}</TableCell>
                <TableCell>
                  {complete ? <SourceBadge kind="manual" /> : <RateMissingBadge />}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div className="mt-4">
          <ComingSoonBanner>
            Equipment rental rate feed — Coming soon
          </ComingSoonBanner>
        </div>
      </SectionShell>

      {/* 3. MARKUPS & MARGINS */}
      <SectionShell
        id={s[2].id}
        index={3}
        title="Markups & Margins"
        registerRef={registerRef}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="overhead">Overhead</Label>
            <Input id="overhead" defaultValue="8.0%" className="tabular-nums" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="profit">Profit</Label>
            <Input id="profit" defaultValue="5.0%" className="tabular-nums" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="general-markup">General Markup</Label>
            <Input
              id="general-markup"
              defaultValue="10.0%"
              className="tabular-nums"
            />
            <p className="text-xs text-muted-foreground">
              Currently applied to the Shasta County estimate
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bond">Bond Premium</Label>
            <Input id="bond" defaultValue="1.2%" className="tabular-nums" />
            <p className="text-xs text-muted-foreground">of contract value</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="insurance">Insurance (GL/umbrella)</Label>
            <Input
              id="insurance"
              key={complete ? "filled" : "empty"}
              defaultValue={complete ? "1.5%" : ""}
              placeholder="e.g. 1.5%"
              aria-invalid={!complete}
              className={cn(
                "tabular-nums",
                !complete && "border-warning/60 focus-visible:ring-warning/40",
              )}
            />
            {complete ? null : (
              <p className="flex items-center gap-1 text-xs font-medium text-warning">
                <AlertTriangle className="size-3" />
                Required
              </p>
            )}
          </div>
        </div>
      </SectionShell>

      {/* 4. TAXES */}
      <SectionShell
        id={s[3].id}
        index={4}
        title="Taxes"
        registerRef={registerRef}
      >
        <div className="flex flex-col gap-5">
          <div className="flex max-w-xs flex-col gap-2">
            <Label htmlFor="sales-tax">CA Sales Tax on materials</Label>
            <Input
              id="sales-tax"
              defaultValue="7.25%"
              className="tabular-nums"
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-md border p-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="material-only" className="cursor-pointer">
                Apply to material costs only
              </Label>
              <p className="text-xs text-muted-foreground">
                Labor and equipment are not taxed in CA
              </p>
            </div>
            <Switch id="material-only" defaultChecked />
          </div>
        </div>
      </SectionShell>

      {/* 5. INDIRECTS & MOBILIZATION */}
      <SectionShell
        id={s[4].id}
        index={5}
        title="Indirects & Mobilization Defaults"
        registerRef={registerRef}
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="mobilization">Default mobilization</Label>
            <Input
              id="mobilization"
              defaultValue="4.5%"
              className="tabular-nums"
            />
            <p className="text-xs text-muted-foreground">
              of subtotal · Overridable per project
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="perdiem">Per-diem / travel</Label>
            <Input id="perdiem" defaultValue="$0" className="tabular-nums" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="small-tools">Small tools</Label>
            <Input
              id="small-tools"
              defaultValue="1.0%"
              className="tabular-nums"
            />
            <p className="text-xs text-muted-foreground">of labor</p>
          </div>
        </div>
      </SectionShell>

      {/* 6. CREW & PRODUCTION */}
      <SectionShell
        id={s[5].id}
        index={6}
        title="Crew & Production Defaults"
        registerRef={registerRef}
      >
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {crewCards.map((crew) => (
              <div
                key={crew.name}
                className="flex flex-col gap-1 rounded-md border p-4"
              >
                <span className="text-sm font-medium">{crew.name}</span>
                <span className="text-sm text-muted-foreground">
                  {crew.composition}
                </span>
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead className="text-right">Production Rate</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productionRows.map((row, index) => (
                  <TableRow
                    key={`${row.activity}-${index}`}
                    className={cn(row.comingSoon && "text-muted-foreground")}
                  >
                    <TableCell
                      className={cn(!row.comingSoon && "font-medium")}
                    >
                      {row.activity}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right",
                        !row.comingSoon && "tabular-nums",
                      )}
                    >
                      {row.rate}
                    </TableCell>
                    <TableCell>
                      {row.comingSoon ? (
                        <span className="text-xs text-muted-foreground">
                          Coming soon
                        </span>
                      ) : (
                        <SourceBadge kind="manual" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </SectionShell>
    </div>
  )
}
