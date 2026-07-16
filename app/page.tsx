import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  FileBarChart,
  Files,
  GitCompareArrows,
  HardHat,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SourceBadge } from "@/components/source-badge"
import { ProductPreviewCard } from "@/components/home/product-preview-card"
import { ReconciliationTeaserTable } from "@/components/home/reconciliation-teaser-table"
import {
  homeCostSetupItems,
  homeDemoPath,
  homeDifferentiatorFlags,
  homeProblems,
  homeReportProvenance,
  homeSolutionSteps,
} from "@/lib/mock-data"

const navLinks = [
  { label: "How it Works", href: "#how-it-works" },
  { label: "Bid Reconciliation", href: "#bid-reconciliation" },
  { label: "Cost Setup", href: "#cost-setup" },
  { label: "Reports", href: "#reports" },
  { label: "Demo", href: "#demo" },
]

const problemIcons = [
  Files,
  ShieldCheck,
  GitCompareArrows,
  SlidersHorizontal,
  FileBarChart,
]

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 supports-backdrop-filter:backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HardHat className="size-4.5" />
            </div>
            <span className="text-base font-semibold leading-tight tracking-tight">
              Constimator
            </span>
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <Button render={<Link href="/dashboard" />}>Launch Demo</Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.49_0.17_254_/_0.14),transparent_55%),linear-gradient(180deg,oklch(0.97_0.01_254)_0%,oklch(1_0_0)_70%)]"
          />
          <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 px-6 py-16 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
            <div className="flex flex-col gap-6">
              <h1 className="text-4xl font-semibold tracking-tight text-balance text-foreground md:text-5xl lg:text-[3.15rem] lg:leading-[1.08]">
                Estimate Public Works Projects Faster from Plans, Specs, and
                Bid Forms
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                Constimator helps contractors upload bid documents, extract
                project requirements, organize estimate items, apply company
                labor and equipment rates, reconcile against the official bid
                form, and export professional reports.
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    size="lg"
                    className="h-11 px-5 text-sm"
                    render={<Link href="/dashboard" />}
                  >
                    Launch Contractor Demo
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-11 px-5 text-sm"
                    render={<Link href="/reconciliation" />}
                  >
                    View Bid Reconciliation
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Interactive prototype using sample project data.
                </p>
              </div>
            </div>
            <ProductPreviewCard />
          </div>
        </section>

        {/* Problem */}
        <section className="border-b border-border py-16 md:py-20">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="mb-10 max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
                Estimating from public works bid packages is slow and risky.
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {homeProblems.map((problem, index) => {
                const Icon = problemIcons[index] ?? Files
                return (
                  <div
                    key={problem.title}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5"
                  >
                    <div className="flex size-9 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                      <Icon className="size-4" />
                    </div>
                    <h3 className="text-base font-semibold leading-snug">
                      {problem.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {problem.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Solution / How it Works */}
        <section
          id="how-it-works"
          className="scroll-mt-24 border-b border-border bg-muted/30 py-16 md:py-20"
        >
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="mb-10 max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
                Constimator organizes the bid package into an
                estimate-ready workflow.
              </h2>
            </div>
            <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              {homeSolutionSteps.map((item) => (
                <li
                  key={item.step}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-background p-5"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {item.step}
                  </span>
                  <p className="flex-1 text-sm leading-relaxed text-foreground">
                    {item.description}
                  </p>
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    {item.linkLabel}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Key Differentiator: Bid Form Reconciliation */}
        <section
          id="bid-reconciliation"
          className="scroll-mt-24 border-b border-border py-16 md:py-20"
        >
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div className="flex flex-col gap-5">
                <Badge
                  variant="outline"
                  className="w-fit border-primary/30 bg-primary/5 text-primary"
                >
                  Key Differentiator
                </Badge>
                <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
                  Compare your estimate against the official bid form
                  before bid day.
                </h2>
                <p className="text-base leading-relaxed text-muted-foreground">
                  Constimator helps identify:
                </p>
                <ul className="flex flex-col gap-2.5">
                  {homeDifferentiatorFlags.map((flag) => (
                    <li
                      key={flag}
                      className="flex items-start gap-2.5 text-sm text-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      {flag}
                    </li>
                  ))}
                </ul>
                <div>
                  <Button render={<Link href="/reconciliation" />}>
                    See Full Reconciliation Demo
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </div>
              </div>
              <ReconciliationTeaserTable />
            </div>
          </div>
        </section>

        {/* Company Cost Setup */}
        <section
          id="cost-setup"
          className="scroll-mt-24 border-b border-border bg-muted/30 py-16 md:py-20"
        >
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
              <div className="flex flex-col gap-5">
                <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
                  Use each contractor&apos;s own labor, equipment, bond, and
                  markup rates.
                </h2>
                <p className="text-base leading-relaxed text-muted-foreground">
                  Contractors can configure:
                </p>
                <div>
                  <Button variant="outline" render={<Link href="/cost-setup" />}>
                    View Cost Setup
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {homeCostSetupItems.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-3 text-sm font-medium"
                  >
                    <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Reports */}
        <section
          id="reports"
          className="scroll-mt-24 border-b border-border py-16 md:py-20"
        >
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="mb-10 max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
                Export professional reports with clear quantity provenance.
              </h2>
              <p className="mt-2 text-muted-foreground">
                Reports distinguish:
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {homeReportProvenance.map((item) => (
                <div
                  key={item.kind}
                  className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4"
                >
                  <SourceBadge kind={item.kind} className="w-fit" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Button render={<Link href="/reports" />}>
                View Reports
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
        </section>

        {/* Demo Path */}
        <section
          id="demo"
          className="scroll-mt-24 border-b border-border bg-muted/30 py-16 md:py-20"
        >
          <div className="mx-auto w-full max-w-3xl px-6">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Recommended OPS Demo Path
              </h2>
            </div>
            <ol className="flex flex-col gap-2.5">
              {homeDemoPath.map((label, index) => (
                <li
                  key={label}
                  className="flex items-center gap-4 rounded-lg border border-border bg-background px-4 py-3"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium">{label}</span>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                className="h-11 px-5"
                render={<Link href="/demo-guide" />}
              >
                Open Demo Guide
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-primary/[0.04] py-16 md:py-20">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 text-center">
            <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-balance md:text-3xl">
              See how Constimator will work for contractors.
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                className="h-11 px-5"
                render={<Link href="/dashboard" />}
              >
                Launch Contractor Demo
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 px-5"
                render={<Link href="/reconciliation" />}
              >
                Start with Bid Reconciliation
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">Constimator</p>
          <div className="flex flex-col gap-0.5 text-sm text-muted-foreground sm:items-end">
            <p>Interactive prototype using sample data.</p>
            <p className="text-xs">
              No real AI processing or project files are used in this demo.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
