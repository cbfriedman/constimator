"use client"

import { useState } from "react"
import { HardHat, Menu, X } from "lucide-react"

const navLinks = [
  { label: "What we extract", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "AI takeoff", href: "#takeoff" },
  { label: "Pricing", href: "#pricing" },
  { label: "Results", href: "#results" },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#" className="flex items-center gap-2" aria-label="Constimator home">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HardHat className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">Constimator</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
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

        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/dashboard"
            className="text-sm font-medium text-foreground transition-colors hover:text-muted-foreground"
          >
            Sign in
          </a>
          <a
            href="/dashboard"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
          >
            Get started
          </a>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4" aria-label="Mobile">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
              <a href="/dashboard" className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                Sign in
              </a>
              <a
                href="/dashboard"
                className="rounded-md bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground"
              >
                Get started
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
