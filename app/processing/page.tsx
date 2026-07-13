"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Circle, Loader2, Search } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { demoProject } from "@/lib/demo-data"
import { cn } from "@/lib/utils"

const STAGES = [
  "Validating documents",
  "Extracting text (539 pages)",
  "Reading plans & specifications",
  "Extracting schedules & bid requirements",
  "Analyzing official bid form",
  "Generating project summary",
  "Preparing bid form reconciliation",
]

const FINDINGS = [
  "Found: Bid Schedule — 15 items",
  "Found: Working days — 60",
  "Found: Liquidated damages — $2,500/day",
  "Found: Addendum 01 — HMA quantity revised",
]

const STAGE_MS = 1000

export default function Page() {
  const router = useRouter()
  // number of completed stages; current stage is `completed`
  const [completed, setCompleted] = useState(0)
  const [findingIndex, setFindingIndex] = useState(0)

  useEffect(() => {
    if (completed >= STAGES.length) {
      const done = setTimeout(() => {
        router.push("/intelligence")
        toast.success(
          "Analysis complete — 15 bid items, 6 schedules, 4 risks found.",
        )
      }, 600)
      return () => clearTimeout(done)
    }
    const timer = setTimeout(() => setCompleted((c) => c + 1), STAGE_MS)
    return () => clearTimeout(timer)
  }, [completed, router])

  useEffect(() => {
    const rotate = setInterval(() => {
      setFindingIndex((i) => (i + 1) % FINDINGS.length)
    }, 1600)
    return () => clearInterval(rotate)
  }, [])

  const progress = Math.min(
    100,
    Math.round((completed / STAGES.length) * 100),
  )

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1 text-center">
        <p className="text-sm font-medium text-primary">AI Analysis in Progress</p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {demoProject.name}
        </h1>
        <p className="text-sm text-muted-foreground">5 documents · 539 pages</p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-6 py-6">
          <ol className="flex flex-col gap-1">
            {STAGES.map((stage, i) => {
              const isCompleted = i < completed
              const isCurrent = i === completed
              return (
                <li
                  key={stage}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                    isCurrent && "bg-primary/5",
                  )}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center">
                    {isCompleted ? (
                      <span className="flex size-5 items-center justify-center rounded-full bg-success text-success-foreground">
                        <Check className="size-3.5" />
                      </span>
                    ) : isCurrent ? (
                      <Loader2 className="size-5 animate-spin text-primary" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground/40" />
                    )}
                  </span>
                  <span
                    className={cn(
                      isCompleted && "text-foreground",
                      isCurrent && "font-medium text-foreground",
                      !isCompleted && !isCurrent && "text-muted-foreground",
                    )}
                  >
                    {stage}
                  </span>
                </li>
              )
            })}
          </ol>

          <div className="flex flex-col gap-2">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground text-pretty">
              Usually 3–8 minutes for a set this size. We&apos;ll email you when
              it&apos;s done — feel free to close this tab.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
        <Search className="size-4 shrink-0 text-primary" />
        <span key={findingIndex} className="text-foreground">
          {FINDINGS[findingIndex]}
        </span>
      </div>

      <div className="flex justify-center">
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Run in Background
        </Button>
      </div>
    </div>
  )
}
