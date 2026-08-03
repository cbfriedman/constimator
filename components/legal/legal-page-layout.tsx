import Link from "next/link"
import { HardHat } from "lucide-react"

// Shared chrome for /terms and /privacy — plain, readable, no dashboard
// styling. Content is passed as children using plain <h2>/<p>/<ul>/<li>
// (no per-element classNames needed); the descendant-selector classes
// below style them once instead of wrapping every paragraph in this
// codebase's usual component primitives, which would be unreadable at
// this length.
export function LegalPageLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string
  lastUpdated: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HardHat className="size-5" />
            </div>
            <p className="text-sm font-semibold">Constimator</p>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground hover:underline">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-foreground hover:underline">
              Privacy Policy
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <div className="mb-8 flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">Last updated {lastUpdated}</p>
        </div>

        <div
          className="flex flex-col gap-4 text-sm leading-relaxed text-foreground
            [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground
            [&_h2:first-child]:mt-0
            [&_p]:text-muted-foreground
            [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:pl-5 [&_ul]:text-muted-foreground
            [&_li]:leading-relaxed
            [&_strong]:font-medium [&_strong]:text-foreground
            [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2"
        >
          {children}
        </div>
      </main>
    </div>
  )
}
