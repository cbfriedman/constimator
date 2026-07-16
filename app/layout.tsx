import type { Metadata } from "next"
<<<<<<< HEAD
import { Inter, Space_Grotesk } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Constimator — Bid / No-Bid Analysis for Public Works Contractors",
  description:
    "Constimator reads public works plans and specs and extracts the parameters that drive your bid decision — engineer's estimate, project duration, liquidated damages, bonding, and DBE requirements — in minutes.",
  keywords: [
    "public works bidding",
    "bid no bid decision",
    "construction bid analysis",
    "engineer's estimate",
    "liquidated damages",
    "DBE requirements",
    "bonding requirements",
    "plans and specifications",
  ],
  openGraph: {
    title: "Constimator — Bid / No-Bid Analysis for Public Works Contractors",
    description:
      "Extract engineer's estimate, project duration, liquidated damages, bonding, and DBE requirements from plans and specs in minutes. Decide bid or no-bid with confidence.",
    type: "website",
  },
}

export const viewport = {
  themeColor: "#faf9f6",
=======
import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { AppShell } from "@/components/app-shell"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
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
>>>>>>> b4634eb12b576bb4756d482e772ea68726e62c70
}

export default function RootLayout({
  children,
<<<<<<< HEAD
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} bg-background`}>
      <body className="font-sans antialiased">{children}</body>
=======
}: Readonly<{
  children: React.ReactNode
}>) {
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
          <AppShell>{children}</AppShell>
          <Toaster />
        </ThemeProvider>
      </body>
>>>>>>> b4634eb12b576bb4756d482e772ea68726e62c70
    </html>
  )
}
