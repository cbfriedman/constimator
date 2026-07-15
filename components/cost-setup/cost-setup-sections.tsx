"use client"

import * as React from "react"
import { AlertTriangle, Clock, Pencil, Plus, X } from "lucide-react"
import { toast } from "sonner"

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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { SourceBadge } from "@/components/source-badge"
import { useProjectState } from "@/components/project-state-provider"
import {
  costSetupSections,
  crewCards,
  equipmentRates,
  laborRates,
  marginFields,
  money,
  cementMasonRate,
  pct,
  projectLabel,
  projectShort,
  productionRows,
  rateHistorySeed,
  seededOverrides,
  waterTruckRate,
  type EquipmentRate,
  type LaborRate,
  type MarginField,
  type Override,
  type RateHistoryEntry,
} from "@/lib/cost-setup-data"
import { cn } from "@/lib/utils"

export type CostSetupView = "company" | "project"

type EditTarget =
  | { kind: "labor"; id: string; title: string; base: number; fringe: number }
  | { kind: "equipment"; id: string; title: string; rate: number }
  | { kind: "margin"; id: string; title: string; value: number }

const PENDING_IDS = new Set(["cement-mason", "water-truck", "insurance"])

function formatNow() {
  const d = new Date()
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
  return `${date} ${time}`
}

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
  view,
  registerRef,
}: {
  complete: boolean
  view: CostSetupView
  registerRef: (id: string, el: HTMLElement | null) => void
}) {
  const s = costSetupSections
  const { triggerRateDrift } = useProjectState()

  const [labor, setLabor] = React.useState<LaborRate[]>([
    ...laborRates,
    cementMasonRate,
  ])
  const [equipment, setEquipment] = React.useState<EquipmentRate[]>([
    ...equipmentRates,
    waterTruckRate,
  ])
  const [margins, setMargins] = React.useState<MarginField[]>(marginFields)
  const [overrides, setOverrides] = React.useState<Record<string, Override>>({
    ...seededOverrides,
  })
  const [history, setHistory] = React.useState<RateHistoryEntry[]>(rateHistorySeed)

  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<EditTarget | null>(null)

  // Edit dialog form state
  const [scope, setScope] = React.useState<"company" | "project">("company")
  const [note, setNote] = React.useState("")
  const [project, setProject] = React.useState(projectLabel)
  const [baseInput, setBaseInput] = React.useState("")
  const [fringeInput, setFringeInput] = React.useState("")
  const [rateInput, setRateInput] = React.useState("")
  const [valueInput, setValueInput] = React.useState("")

  const showsProject = view === "project"

  function openEdit(target: EditTarget) {
    setScope("company")
    setNote("")
    setProject(projectLabel)
    if (target.kind === "labor") {
      setBaseInput(String(target.base))
      setFringeInput(String(target.fringe))
    } else if (target.kind === "equipment") {
      setRateInput(String(target.rate))
    } else {
      setValueInput(String(target.value))
    }
    setEditTarget(target)
  }

  function appendHistory(change: string, scopeLabel: string, changeNote: string) {
    setHistory((prev) => [
      {
        id: `h-${Date.now()}`,
        date: formatNow(),
        user: "Mike Torres",
        change,
        scope: scopeLabel,
        note: changeNote,
      },
      ...prev,
    ])
  }

  function handleSave() {
    if (!editTarget || !note.trim()) return
    const t = editTarget
    const asProject = scope === "project"
    const scopeLabel = asProject
      ? `Project override — ${projectShort}`
      : "Company default"
    let oldStr = ""
    let newStr = ""

    if (t.kind === "labor") {
      const nb = Number.parseFloat(baseInput) || 0
      const nf = Number.parseFloat(fringeInput) || 0
      oldStr = money(t.base + t.fringe)
      newStr = money(nb + nf)
      if (asProject) {
        setOverrides((prev) => ({
          ...prev,
          [t.id]: { kind: "labor", base: nb, fringe: nf },
        }))
      } else {
        setLabor((prev) =>
          prev.map((r) => (r.id === t.id ? { ...r, base: nb, fringe: nf } : r)),
        )
      }
    } else if (t.kind === "equipment") {
      const nr = Number.parseFloat(rateInput) || 0
      oldStr = money(t.rate)
      newStr = money(nr)
      if (asProject) {
        setOverrides((prev) => ({
          ...prev,
          [t.id]: { kind: "equipment", rate: nr },
        }))
      } else {
        setEquipment((prev) =>
          prev.map((r) => (r.id === t.id ? { ...r, rate: nr } : r)),
        )
      }
    } else {
      const nv = Number.parseFloat(valueInput) || 0
      oldStr = pct(t.value)
      newStr = pct(nv)
      if (asProject) {
        setOverrides((prev) => ({
          ...prev,
          [t.id]: { kind: "margin", value: nv },
        }))
      } else {
        setMargins((prev) =>
          prev.map((r) => (r.id === t.id ? { ...r, value: nv } : r)),
        )
      }
    }

    appendHistory(`${t.title}: ${oldStr} → ${newStr}`, scopeLabel, note.trim())
    // Editing a company default drifts existing estimate snapshots.
    if (!asProject) {
      triggerRateDrift()
    }
    toast.success("Rate updated")
    setEditTarget(null)
  }

  function revert(id: string) {
    setOverrides((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function RowActions({ onEdit }: { onEdit: () => void }) {
    return (
      <div className="flex items-center justify-end gap-0.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          aria-label="Edit rate"
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setHistoryOpen(true)}
          aria-label="Rate history"
        >
          <Clock />
        </Button>
      </div>
    )
  }

  function OverrideChip({ id }: { id: string }) {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full border border-review/50 bg-review/5 px-2 py-0.5 text-xs font-medium text-review">
        Project override — {projectShort}
        <button
          type="button"
          onClick={() => revert(id)}
          aria-label="Revert to company default"
          className="-mr-0.5 rounded-full outline-none hover:text-review/80 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3" />
        </button>
      </span>
    )
  }

  return (
    <TooltipProvider>
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
                  <TableHead className="w-0 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labor.map((row) => {
                  const pending = PENDING_IDS.has(row.id) && !complete
                  const ov =
                    showsProject && overrides[row.id]?.kind === "labor"
                      ? (overrides[row.id] as { base: number; fringe: number })
                      : null
                  const base = ov ? ov.base : row.base
                  const fringe = ov ? ov.fringe : row.fringe
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(pending && "bg-warning/5")}
                    >
                      <TableCell className="font-medium">
                        {row.classification}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {pending ? "—" : money(base)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {pending ? "—" : money(fringe)}
                      </TableCell>
                      <TableCell className="text-right">
                        {pending ? (
                          <span className="tabular-nums">—</span>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-medium tabular-nums">
                              {money(base + fringe)}
                            </span>
                            {ov ? <OverrideChip id={row.id} /> : null}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {pending ? (
                          <RateMissingBadge />
                        ) : (
                          <SourceBadge kind="manual" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {pending ? null : (
                          <RowActions
                            onEdit={() =>
                              openEdit({
                                kind: "labor",
                                id: row.id,
                                title: row.classification,
                                base: row.base,
                                fringe: row.fringe,
                              })
                            }
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
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
                  <TableHead className="w-0 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((row) => {
                  const pending = PENDING_IDS.has(row.id) && !complete
                  const ov =
                    showsProject && overrides[row.id]?.kind === "equipment"
                      ? (overrides[row.id] as { rate: number })
                      : null
                  const rate = ov ? ov.rate : row.rate
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(pending && "bg-warning/5")}
                    >
                      <TableCell className="font-medium">
                        {row.equipment}
                      </TableCell>
                      <TableCell className="text-right">
                        {pending ? (
                          <span className="tabular-nums">—</span>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <span className="tabular-nums">{money(rate)}</span>
                            {ov ? <OverrideChip id={row.id} /> : null}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.unit}
                      </TableCell>
                      <TableCell>{row.ownership}</TableCell>
                      <TableCell>
                        {pending ? (
                          <RateMissingBadge />
                        ) : (
                          <SourceBadge kind="manual" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {pending ? null : (
                          <RowActions
                            onEdit={() =>
                              openEdit({
                                kind: "equipment",
                                id: row.id,
                                title: row.equipment,
                                rate: row.rate,
                              })
                            }
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
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
            {margins.map((row) => {
              const pending = PENDING_IDS.has(row.id) && !complete
              const ov =
                showsProject && overrides[row.id]?.kind === "margin"
                  ? (overrides[row.id] as { value: number })
                  : null
              const value = ov ? ov.value : row.value
              return (
                <div
                  key={row.id}
                  className="flex flex-col gap-2 rounded-md border p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Label className="text-sm">{row.label}</Label>
                    {pending ? null : (
                      <RowActions
                        onEdit={() =>
                          openEdit({
                            kind: "margin",
                            id: row.id,
                            title: row.label,
                            value: row.value,
                          })
                        }
                      />
                    )}
                  </div>
                  {pending ? (
                    <>
                      <Input
                        placeholder="e.g. 1.5%"
                        aria-invalid
                        readOnly
                        className="border-warning/60 tabular-nums focus-visible:ring-warning/40"
                      />
                      <p className="flex items-center gap-1 text-xs font-medium text-warning">
                        <AlertTriangle className="size-3" />
                        Required
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="text-lg font-semibold tabular-nums">
                        {pct(value)}
                      </span>
                      {ov ? <OverrideChip id={row.id} /> : null}
                      {row.helper ? (
                        <p className="text-xs text-muted-foreground">
                          {row.helper}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              )
            })}
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

      {/* EDIT DIALOG */}
      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {editTarget?.title}</DialogTitle>
            <DialogDescription>
              Update the rate and record why it is changing.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5">
            {/* Value inputs */}
            {editTarget?.kind === "labor" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-base">Base rate ($/hr)</Label>
                  <Input
                    id="edit-base"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={baseInput}
                    onChange={(e) => setBaseInput(e.target.value)}
                    className="tabular-nums"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-fringe">Fringe ($/hr)</Label>
                  <Input
                    id="edit-fringe"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={fringeInput}
                    onChange={(e) => setFringeInput(e.target.value)}
                    className="tabular-nums"
                  />
                </div>
              </div>
            ) : null}
            {editTarget?.kind === "equipment" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-rate">Rate ($/hr)</Label>
                <Input
                  id="edit-rate"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="tabular-nums"
                />
              </div>
            ) : null}
            {editTarget?.kind === "margin" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-value">Percentage (%)</Label>
                <Input
                  id="edit-value"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                  className="tabular-nums"
                />
              </div>
            ) : null}

            {/* Scope */}
            <RadioGroup
              value={scope}
              onValueChange={(v) => setScope(v as "company" | "project")}
              className="gap-3"
            >
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="scope-company"
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <RadioGroupItem value="company" id="scope-company" />
                  Edit company default
                </label>
                <p className="pl-6 text-xs text-muted-foreground">
                  Applies to future projects. Existing estimates keep their
                  snapshot.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="scope-project"
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <RadioGroupItem value="project" id="scope-project" />
                  Override for this project only
                </label>
                {scope === "project" ? (
                  <div className="pl-6">
                    <Select value={project} onValueChange={setProject}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={projectLabel}>
                          {projectLabel}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            </RadioGroup>

            {/* Apply to future projects (company default only) */}
            {scope === "company" ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <label
                      htmlFor="apply-future"
                      className="flex w-fit items-center gap-2 text-sm text-muted-foreground"
                    />
                  }
                >
                  <Checkbox id="apply-future" checked disabled />
                  Apply to future projects
                </TooltipTrigger>
                <TooltipContent>
                  Company defaults always apply to future projects.
                </TooltipContent>
              </Tooltip>
            ) : null}

            {/* Change note */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-note">Change note — why is this changing?</Label>
              <Input
                id="edit-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Required"
                aria-invalid={note.trim().length === 0}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button onClick={handleSave} disabled={note.trim().length === 0}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RATE HISTORY DRAWER */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Rate History</SheetTitle>
            <SheetDescription>
              Every change to company defaults and project overrides.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <ol className="flex flex-col gap-3">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-col gap-1 rounded-md border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{entry.change}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{entry.date}</span>
                    <span aria-hidden>·</span>
                    <span>{entry.user}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-medium",
                        entry.scope.startsWith("Project override")
                          ? "border-review/50 bg-review/5 text-review"
                          : "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {entry.scope}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    &ldquo;{entry.note}&rdquo;
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  )
}
