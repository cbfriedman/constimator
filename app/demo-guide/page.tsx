import Link from "next/link"
import { ArrowRight, HardHat } from "lucide-react"

import { Button } from "@/components/ui/button"
import { opsDemoPath } from "@/lib/mock-data"

const stepHrefs = [
  "/",
  "/",
  "/dashboard",
  "/intelligence",
  "/intelligence",
  "/cost-setup",
  "/estimate",
  "/reconciliation",
  "/review",
  "/reports",
]

export default function DemoGuidePage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HardHat className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Constimator</p>
              <p className="text-xs text-muted-foreground">OPS Demo Guide</p>
            </div>
          </div>
          <Button variant="outline" render={<Link href="/" />}>
            Back to Home
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <div className="mb-8 space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            Recommended Demo Path for OPS
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Use this sequence when presenting Constimator. Every step uses
            sample data only — no real AI processing, auth, or project files.
          </p>
        </div>

        <ol className="flex flex-col gap-3">
          {opsDemoPath.map((label, index) => (
            <li key={label}>
              <Link
                href={stepHrefs[index] ?? "/"}
                className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <span className="flex-1 text-sm font-medium">{label}</span>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button size="lg" className="h-11 px-5" render={<Link href="/" />}>
            Start at Home Page
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-11 px-5"
            render={<Link href="/dashboard" />}
          >
            Jump to Dashboard
          </Button>
        </div>
      </main>
    </div>
  )
}
