"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { HardHat, Menu, X } from "lucide-react"
import styles from "@/components/home/landing.module.css"

const navLinks = [
  { label: "Reconciliation", href: "#reconciliation" },
  { label: "How it works", href: "#how-it-works" },
  { label: "What it does", href: "#what-it-does" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        menuButton.current?.focus()
      }
    }
    document.addEventListener("keydown", closeOnEscape)
    return () => document.removeEventListener("keydown", closeOnEscape)
  }, [open])

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="Constimator home">
        <span>
          <HardHat size={23} strokeWidth={1.7} aria-hidden="true" />
        </span>
        Constimator
      </Link>
      <nav className={styles.desktopNav} aria-label="Primary">
        {navLinks.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      <div className={styles.headerActions}>
        <Link href="/sign-in">Sign in</Link>
        <Link href="/sign-up" className={styles.headerCta}>
          Get started
        </Link>
      </div>
      <button
        ref={menuButton}
        type="button"
        className={styles.menuButton}
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-navigation"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      {open && (
        <nav
          id="mobile-navigation"
          className={styles.mobileNav}
          aria-label="Mobile"
        >
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <Link href="/sign-in">Sign in</Link>
          <Link href="/sign-up" className={styles.headerCta}>
            Get started
          </Link>
        </nav>
      )}
    </header>
  )
}
