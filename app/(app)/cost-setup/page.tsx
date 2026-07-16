"use client"

import * as React from "react"
import { Building2, Save, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SectionNav } from "@/components/cost-setup/section-nav"
import {
  CostSetupSections,
  type CostSetupView,
} from "@/components/cost-setup/cost-setup-sections"
import { useProjectState } from "@/components/project-state-provider"
import { cn } from "@/lib/utils"
import {
  costSetupSections,
  type CostSetupSectionId,
} from "@/lib/cost-setup-data"

const ALWAYS_COMPLETE: CostSetupSectionId[] = [
  "markups-margins",
  "taxes",
  "indirects-mobilization",
  "crew-production",
]

export default function CostSetupPage() {
  const { costSetupComplete, setCostSetupComplete } = useProjectState()
  const [view, setView] = React.useState<CostSetupView>("project")
  const [activeId, setActiveId] = React.useState<CostSetupSectionId>(
    costSetupSections[0].id,
  )
  const refs = React.useRef<Map<string, HTMLElement>>(new Map())

  const registerRef = React.useCallback(
    (id: string, el: HTMLElement | null) => {
      if (el) refs.current.set(id, el)
      else refs.current.delete(id)
    },
    [],
  )

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) {
          setActiveId(visible[0].target.id as CostSetupSectionId)
        }
      },
      { rootMargin: "-10% 0px -70% 0px", threshold: [0, 0.25, 0.5, 1] },
    )
    refs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const completeIds = React.useMemo(() => {
    const ids = new Set<CostSetupSectionId>(ALWAYS_COMPLETE)
    if (costSetupComplete) {
      ids.add("labor-rates")
      ids.add("equipment-rates")
    }
    return ids
  }, [costSetupComplete])

  function handleSelect(id: CostSetupSectionId) {
    setActiveId(id)
    refs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function handleCompleteDemo() {
    setCostSetupComplete(true)
    setActiveId("labor-rates")
    refs.current
      .get("labor-rates")
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
    toast.success("Setup complete — all 6 sections configured.")
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              Company Cost Setup
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              <Building2 className="size-3" />
              Company-level
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Estimating defaults applied across all projects. Required before
            final calculations and report export.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => toast.success("Defaults saved")}
          >
            <Save data-icon="inline-start" />
            Save Defaults
          </Button>
          <Button onClick={handleCompleteDemo} disabled={costSetupComplete}>
            <Sparkles data-icon="inline-start" />
            Complete Setup (demo)
          </Button>
        </div>
      </header>

      <Alert className="mt-6 border-primary/30 bg-primary/5">
        <AlertTitle>Setup never blocks your workflow</AlertTitle>
        <AlertDescription>
          You can create projects, upload documents, run analysis, and open the
          Estimate Workspace without completing this page. These defaults are
          only required before final calculations and report export.
        </AlertDescription>
      </Alert>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Show:</span>
        <div
          role="radiogroup"
          aria-label="Rate view"
          className="inline-flex items-center rounded-lg border bg-muted/40 p-0.5"
        >
          {(
            [
              { value: "company", label: "Company defaults" },
              { value: "project", label: "This project (with overrides)" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={view === option.value}
              onClick={() => setView(option.value)}
              className={cn(
                "rounded-[calc(var(--radius)-2px)] px-3 py-1.5 text-sm font-medium transition-colors",
                view === option.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        <SectionNav
          activeId={activeId}
          completeIds={completeIds}
          completeCount={completeIds.size}
          onSelect={handleSelect}
        />
        <CostSetupSections
          complete={costSetupComplete}
          view={view}
          registerRef={registerRef}
        />
      </div>
    </div>
  )
}
