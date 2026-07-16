"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Circle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  demoProject,
  processingStages,
  processingSummary,
} from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const STAGE_MS = 200

export default function ProcessingPage() {
  const router = useRouter()
  const [completed, setCompleted] = useState(0)
  const isDone = completed >= processingStages.length

  useEffect(() => {
    if (isDone) return
    const timer = setTimeout(() => setCompleted((c) => c + 1), STAGE_MS)
    return () => clearTimeout(timer)
  }, [completed, isDone])

  function skipToComplete() {
    setCompleted(processingStages.length)
  }

  const progress = Math.min(
    100,
    Math.round((completed / processingStages.length) * 100),
  )

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-primary">AI Processing</p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          AI Processing
        </h1>
        <p className="text-sm text-muted-foreground">
          {demoProject.name} · #{demoProject.number}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isDone ? "Processing complete" : "Analyzing bid package"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ol className="flex flex-col gap-1">
            {processingStages.map((stage, i) => {
              const isCompleted = i < completed
              const isCurrent = i === completed && !isDone
              return (
                <li
                  key={stage}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                    isCurrent && "bg-primary/5",
                  )}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center">
                    {isCompleted || isDone ? (
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
                      "flex-1",
                      (isCompleted || isDone) && "text-foreground",
                      isCurrent && "font-medium text-foreground",
                      !isCompleted && !isCurrent && !isDone && "text-muted-foreground",
                    )}
                  >
                    {stage}
                  </span>
                  {(isCompleted || isDone) && (
                    <span className="text-xs font-medium text-success">
                      Complete
                    </span>
                  )}
                </li>
              )
            })}
          </ol>

          <div className="flex flex-col gap-2">
            <Progress value={isDone ? 100 : progress} />
            <p className="text-xs text-muted-foreground">
              {isDone
                ? "Sample analysis finished. Continue to project intelligence or schedules."
                : "Prototype animation — no real AI processing runs in this demo."}
            </p>
          </div>
        </CardContent>
      </Card>

      {(isDone || completed >= 4) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {processingSummary.map((item) => (
            <Card key={item.label}>
              <CardContent className="flex flex-col gap-1 py-5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    item.tone === "warning" ? "text-warning" : "text-foreground",
                  )}
                >
                  {item.value}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
        {!isDone ? (
          <Button variant="ghost" onClick={skipToComplete}>
            Skip to Results
          </Button>
        ) : null}
        <Button
          variant="outline"
          onClick={() => router.push("/schedules")}
          disabled={!isDone}
        >
          View Schedules &amp; Tables
        </Button>
        <Button
          onClick={() => router.push("/intelligence")}
          disabled={!isDone}
        >
          View Project Intelligence
        </Button>
      </div>
    </div>
  )
}
