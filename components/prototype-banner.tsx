import { Info } from "lucide-react"

// Off by default. This banner used to render unconditionally on every
// authenticated page, which meant a paying customer was told the product
// they'd just subscribed to was a prototype running on sample data — and
// by the time the real worker shipped, its "No live AI processing" claim
// was false as well.
//
// It's kept (rather than deleted) because it's genuinely useful on a demo
// deployment shown to a prospect. Set NEXT_PUBLIC_PROTOTYPE_BANNER=true on
// that deployment only. NEXT_PUBLIC_* is inlined at build time, so a
// production build without the variable set compiles this away entirely.
export function PrototypeBanner() {
  if (process.env.NEXT_PUBLIC_PROTOTYPE_BANNER !== "true") return null

  return (
    <div className="flex items-center justify-center gap-2 border-b border-primary/15 bg-primary/5 px-4 py-2 text-center text-xs text-foreground sm:text-sm">
      <Info className="size-3.5 shrink-0 text-primary" />
      <span>Demo environment · Sample data</span>
    </div>
  )
}
