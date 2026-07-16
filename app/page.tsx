import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  GitCompareArrows,
  HardHat,
  Layers3,
  Upload,
  UserCheck,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  homeHowItWorks,
  homeValueCards,
  homeWhyContractorsCare,
} from "@/lib/mock-data"

const valueIcons = [Upload, Layers3, FileSpreadsheet, GitCompareArrows, UserCheck, CheckCircle2]

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="border-b border-border/80 bg-background/90">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HardHat className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold leading-tight tracking-tight">
                Constimator
              </span>
              <span className="text-xs text-muted-foreground">
                AI Construction Estimating
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" render={<Link href="/demo-guide" />}>
              OPS Demo Guide
            </Button>
            <Button render={<Link href="/dashboard" />}>
              View Contractor Demo
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.49_0.17_254_/_0.14),transparent_55%),linear-gradient(180deg,oklch(0.97_0.01_254)_0%,oklch(1_0_0)_70%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(135deg,transparent_30%,oklch(0.49_0.17_254_/_0.06)_100%)]"
          />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16 md:py-24 lg:py-28">
            <Badge
              variant="outline"
              className="w-fit border-primary/30 bg-background/80 text-primary"
            >
              Clickable Prototype · Sample Data Only
            </Badge>
            <div className="max-w-3xl space-y-5">
              <h1 className="text-4xl font-semibold tracking-tight text-balance text-foreground md:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                AI-Powered Construction Estimating from Plans, Specs, and Bid
                Forms
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                Upload project documents, get AI project intelligence, build
                estimates with your company rates, reconcile against the
                official bid form, request human review, and export professional
                reports — the contractor workflow Constimator is built to
                deliver.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="h-11 px-5 text-sm"
                render={<Link href="/dashboard" />}
              >
                View Contractor Demo
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 px-5 text-sm"
                render={<Link href="/reconciliation" />}
              >
                See Bid Form Reconciliation
              </Button>
            </div>
          </div>
        </section>

        <section className="border-b border-border py-16 md:py-20">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="mb-10 max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                What contractors get
              </h2>
              <p className="mt-2 text-muted-foreground">
                A clear path from bid package to submittal-ready estimate —
                organized for OPS, estimators, and project managers.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {homeValueCards.map((card, index) => {
                const Icon = valueIcons[index] ?? CheckCircle2
                return (
                  <div
                    key={card.title}
                    className="flex flex-col gap-3 border-l-2 border-primary/30 pl-4"
                  >
                    <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <h3 className="text-base font-semibold leading-snug">
                      {card.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {card.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-muted/30 py-16 md:py-20">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="mb-10 max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                How Constimator Works
              </h2>
              <p className="mt-2 text-muted-foreground">
                Seven steps from project setup to exported reports.
              </p>
            </div>
            <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {homeHowItWorks.map((item) => (
                <li
                  key={item.step}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-background p-5"
                >
                  <span className="text-xs font-semibold tracking-wide text-primary uppercase">
                    Step {item.step}
                  </span>
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-b border-border py-16 md:py-20">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="mb-10 max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Why Contractors Care
              </h2>
              <p className="mt-2 text-muted-foreground">
                Built around the realities of public-works bidding — speed,
                accuracy, and clear documentation.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {homeWhyContractorsCare.map((item) => (
                <div key={item.title} className="flex flex-col gap-2">
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-primary/[0.04] py-16 md:py-20">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Built for OPS Demonstration
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                This clickable prototype shows the contractor workflow before
                production implementation. Explore sample projects, AI
                processing outcomes, cost setup, estimate workspace, bid form
                reconciliation, human review, and report export — all with
                sample data only.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="h-11 px-5"
                render={<Link href="/dashboard" />}
              >
                Open Contractor Demo
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 px-5"
                render={<Link href="/demo-guide" />}
              >
                Recommended Demo Path
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">Constimator Prototype</p>
          <p className="text-sm text-muted-foreground">
            Demo only — no real project data is processed.
          </p>
        </div>
      </footer>
    </div>
  )
}
