import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { TrustedBy } from "@/components/trusted-by"
import { Features } from "@/components/features"
import { HowItWorks } from "@/components/how-it-works"
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
        <TrustedBy />
        <Features />
        <HowItWorks />
        <Proof />
        <Pricing />
        <Cta />
      </main>
      <SiteFooter />
    </div>
  )
}
