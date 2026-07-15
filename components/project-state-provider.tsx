"use client"

import * as React from "react"

type ProjectStateValue = {
  /** Whether the missing Item 15 has been added to the estimate. */
  item15Added: boolean
  setItem15Added: (value: boolean) => void
  /** Reconciliation items still needing attention (3 → 2 once Item 15 is added). */
  attentionCount: number
  /**
   * Whether company Estimating Defaults (/cost-setup) are fully configured.
   * Other pages read this to gate final calculations / report export.
   */
  costSetupComplete: boolean
  setCostSetupComplete: (value: boolean) => void
  /**
   * Increments on every demo reset. Used as a React `key` on page content so
   * page-local state (review stage, applied recommendations, processing
   * animation) remounts back to its defaults without a hard refresh.
   */
  resetKey: number
  /** Reset all client-side demo state back to its initial values. */
  reset: () => void
}

const ProjectStateContext = React.createContext<ProjectStateValue | null>(null)

export function ProjectStateProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [item15Added, setItem15Added] = React.useState(false)
  const [costSetupComplete, setCostSetupComplete] = React.useState(false)
  const [resetKey, setResetKey] = React.useState(0)

  const reset = React.useCallback(() => {
    setItem15Added(false)
    setCostSetupComplete(false)
    setResetKey((k) => k + 1)
  }, [])

  const value = React.useMemo<ProjectStateValue>(
    () => ({
      item15Added,
      setItem15Added,
      attentionCount: item15Added ? 2 : 3,
      costSetupComplete,
      setCostSetupComplete,
      resetKey,
      reset,
    }),
    [item15Added, costSetupComplete, resetKey, reset],
  )

  return (
    <ProjectStateContext.Provider value={value}>
      {children}
    </ProjectStateContext.Provider>
  )
}

export function useProjectState() {
  const ctx = React.useContext(ProjectStateContext)
  if (!ctx) {
    throw new Error(
      "useProjectState must be used within a ProjectStateProvider",
    )
  }
  return ctx
}

/**
 * Wraps the page content and remounts it whenever the demo is reset, so any
 * page-local component state falls back to its initial values.
 */
export function ResettableMain({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const { resetKey } = useProjectState()
  return (
    <main key={resetKey} className={className}>
      {children}
    </main>
  )
}
