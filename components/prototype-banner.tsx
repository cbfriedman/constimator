import { Info } from "lucide-react"

export function PrototypeBanner() {
  return (
    <div className="flex items-center justify-center gap-2 border-b border-primary/15 bg-primary/5 px-4 py-2 text-center text-xs text-foreground sm:text-sm">
      <Info className="size-3.5 shrink-0 text-primary" />
      <span>
        Prototype Demo · Sample data only · No real AI processing
      </span>
    </div>
  )
}
