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
  title: "Constimator — Construction Estimates & Bids, Done Right",
  description:
    "Constimator helps contractors and builders create accurate construction estimates, bids, and quotes in minutes. Win more jobs with faster, more precise pricing.",
  keywords: [
    "construction estimating software",
    "contractor estimates",
    "construction bids",
    "cost estimating",
    "takeoff software",
  ],
  openGraph: {
    title: "Constimator — Construction Estimates & Bids, Done Right",
    description:
      "Create accurate construction estimates, bids, and quotes in minutes. Win more jobs with faster, more precise pricing.",
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
