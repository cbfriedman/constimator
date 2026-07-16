import type { Metadata } from "next"
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} bg-background`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
