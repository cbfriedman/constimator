import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { AppShell } from "@/components/app-shell"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { getProjectStateSnapshot } from "@/lib/project-state-actions"
import { cn } from "@/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Constimator — AI Construction Estimating",
  description:
    "AI-powered construction estimating for contractors. Prototype demo.",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Fetched here (not lower in the tree) so ProjectStateProvider never shows
  // a flash of default state before real data arrives — this runs for every
  // route, including signed-out marketing pages, which is why
  // getProjectStateSnapshot() returns null instead of throwing in that case.
  const initialProjectState = await getProjectStateSnapshot()

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "scroll-smooth bg-background antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable,
      )}
    >
      <body>
        <ThemeProvider>
          <AppShell initialProjectState={initialProjectState}>
            {children}
          </AppShell>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
