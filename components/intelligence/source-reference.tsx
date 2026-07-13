"use client"

import * as React from "react"
import { FileText } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type SourceContextValue = {
  openSource: (label: string) => void
}

const SourceContext = React.createContext<SourceContextValue | null>(null)

export function SourceReferenceProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [label, setLabel] = React.useState("")

  const openSource = React.useCallback((next: string) => {
    setLabel(next)
    setOpen(true)
  }, [])

  return (
    <SourceContext.Provider value={{ openSource }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Source Reference</DialogTitle>
            <DialogDescription>
              Cited from the project documents. This is a static preview.
            </DialogDescription>
          </DialogHeader>
          <div className="flex h-80 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/40 text-center">
            <FileText className="size-8 text-muted-foreground" />
            <p className="max-w-xs text-sm text-muted-foreground">
              {"PDF viewer — "}
              <span className="font-medium text-foreground">{label}</span>
              {" (highlighted region)"}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </SourceContext.Provider>
  )
}

export function useSourceReference() {
  const ctx = React.useContext(SourceContext)
  if (!ctx) {
    throw new Error(
      "useSourceReference must be used within a SourceReferenceProvider",
    )
  }
  return ctx
}

export function SourceChip({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  const ctx = React.useContext(SourceContext)

  return (
    <button
      type="button"
      onClick={() => ctx?.openSource(label)}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-1.5 py-0.5 align-middle text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-1 focus-visible:outline-ring",
        className,
      )}
    >
      <FileText className="size-3" />
      {label}
    </button>
  )
}
