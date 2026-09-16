import { Hero } from "@/components/hero"
import { Problem } from "@/components/problem"
import { ReconciliationShowcase } from "@/components/reconciliation-showcase"
import { HowItWorks } from "@/components/how-it-works"
import { Testimonial } from "@/components/testimonial"
import { Features } from "@/components/features"
import { Proof } from "@/components/proof"
import { WhoItsFor } from "@/components/who-its-for"
import { Pricing } from "@/components/pricing"
import { Faq } from "@/components/faq"
import { Cta } from "@/components/cta"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import styles from "@/components/home/landing.module.css"

// Order matters here, so it's worth writing down:
//
//   Hero        — the cost of the mistake, in one sentence
//   Problem     — why it happens to good estimators, with the dollar figure
//   Showcase    — the annotated reconciliation table; the proof, and the point
//   HowItWorks  — three steps, now that they want to know
//   Testimonial — renders nothing until there is a real quote (see the file)
//   Features    — the full capability list, for people still reading
//   Proof       — the sample project they can go poke at themselves
//   WhoItsFor   — qualification
//   Pricing     — founding members
//   Faq         — objections, including the old "Not another takeoff tool"
//   Cta         — ask again
//
// <WhyDifferent /> is gone: its copy is the first FAQ entry now.
export default function HomePage() {
  // `theme-dark` pins this page to the dark palette whatever the app-level
  // theme is set to (the "d" hotkey flips the app, not this page). The
  // header sits outside <main> and outside the hero on purpose: it is
  // sticky, and sticky elements only stick within their parent — inside the
  // hero it scrolled away after the first screen. This also puts the
  // <header> landmark where assistive tech expects it, beside <main>.
  return (
    <div className={`${styles.page} theme-dark flex min-h-screen flex-col`}>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Problem />
        <ReconciliationShowcase />
        <HowItWorks />
        <Testimonial />
        <Features />
        <Proof />
        <WhoItsFor />
        <Pricing />
        <Faq />
        <Cta />
      </main>
      <SiteFooter />
    </div>
  )
}
