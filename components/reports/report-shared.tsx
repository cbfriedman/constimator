import { cn } from "@/lib/utils"
import { disclosureText, provenanceLegend } from "@/lib/report-data"

export function ProvenanceLegend() {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Quantity Provenance
      </p>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {provenanceLegend.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className={cn("size-2.5 shrink-0 rounded-full", item.dotClass)}
              aria-hidden
            />
            <span className="text-xs text-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DisclosureBlock() {
  return (
    <p className="mt-6 border-t border-border pt-4 text-xs italic leading-relaxed text-muted-foreground">
      {disclosureText}
    </p>
  )
}
