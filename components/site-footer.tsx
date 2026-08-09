import Link from "next/link"
import { HardHat } from "lucide-react"

const groups = [
  {
    heading: "Product",
    links: [
      { label: "What it does", href: "/#what-it-does" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Reconciliation", href: "/#reconciliation" },
      { label: "Pricing", href: "/#pricing" },
    ],
  },
  {
    heading: "Company",
    links: [{ label: "Contact", href: "mailto:support@constimator.com" }],
  },
  {
    heading: "Resources",
    links: [{ label: "Public works FAQ", href: "/help" }],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2" aria-label="Constimator home">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <HardHat className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-display text-xl font-bold tracking-tight">Constimator</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Bid-form reconciliation and document intelligence for public works contractors.
            </p>
          </div>

          {groups.map((group) => (
            <div key={group.heading}>
              <h3 className="text-sm font-semibold">{group.heading}</h3>
              <ul className="mt-4 flex flex-col gap-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Early access. Built by a former public works contractor.
            {" "}© {new Date().getFullYear()} Constimator.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms of Service
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
