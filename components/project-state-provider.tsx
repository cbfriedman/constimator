"use client"

import * as React from "react"

type ProjectStateValue = {
  /** Whether the missing Item 15 has been added to the estimate. */
  item15Added: boolean
  setItem15Added: (value: boolean) => void
  /** Reconciliation items still needing attention (3 → 2 once Item 15 is added). */
  attentionCount: number
}

const ProjectStateContext = React.createContext<ProjectStateValue | null>(null)

export function ProjectStateProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [item15Added, setItem15Added] = React.useState(false)

  const value = React.useMemo<ProjectStateValue>(
    () => ({
      item15Added,
      setItem15Added,
      attentionCount: item15Added ? 2 : 3,
    }),
    [item15Added],
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
