import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { Problem } from "@/components/problem"
import { Features } from "@/components/features"
import { HowItWorks } from "@/components/how-it-works"
import { WhyDifferent } from "@/components/why-different"
import { Proof } from "@/components/proof"
import { Pricing } from "@/components/pricing"
import { Cta } from "@/components/cta"
import { SiteFooter } from "@/components/site-footer"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Problem />
        <Features />
        <HowItWorks />
        <WhyDifferent />
        <Proof />
        <Pricing />
        <Cta />
      </main>
      <SiteFooter />
    </div>
  )
}
