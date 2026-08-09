"use client"

import * as React from "react"

import {
  dismissDriftAction,
  recalculateAction,
  resetProjectStateAction,
  setCostSetupCompleteAction,
  triggerRateDriftAction,
  type ProjectStateSnapshot,
} from "@/lib/project-state-actions"
import { formatDisplayDate, todayIsoDate } from "@/lib/format-date"

type ProjectStateValue = {
  /** The org's current project id (see lib/current-project.ts), or null. */
  currentProjectId: string | null
  /** Real name/number for the same current project, or null. */
  currentProjectName: string | null
  currentProjectNumber: string | null
  /** Real days-until-bid for the current project, or null with no bid date. */
  currentProjectDaysOut: number | null
  /** The real signed-in user — TopBar's account menu. */
  user: { name: string; email: string; initials: string }
  /** The real signed-in user's org name — TopBar's account menu. */
  orgName: string
  /** Real count of reconciliation diff rows needing attention. */
  attentionCount: number
  /**
   * Whether company Estimating Defaults (/cost-setup) are fully configured.
   * Other pages read this to gate final calculations / report export.
   */
  costSetupComplete: boolean
  setCostSetupComplete: (value: boolean) => void
  /**
   * The date the current estimate's rate snapshot was captured. Editing a
   * company rate never changes this; only a recalculation does.
   */
  rateSnapshotDate: string
  /**
   * Whether company-default rates have changed since the estimate's snapshot
   * (set by editing a company rate on /cost-setup or the demo trigger).
   */
  rateDrift: boolean
  /** Flag company rates as changed since the snapshot. */
  triggerRateDrift: () => void
  /** Whether the user dismissed the drift banner via "Keep Snapshot". */
  driftDismissed: boolean
  /** Dismiss the drift banner without changing the snapshot. */
  dismissDrift: () => void
  /** Whether the estimate has been recalculated against current rates. */
  recalculated: boolean
  /** Recalculate: advance the snapshot to today and clear drift. */
  recalculate: () => void
  /**
   * Increments on every demo reset. Used as a React `key` on page content so
   * page-local state (review stage, applied recommendations, processing
   * animation) remounts back to its defaults without a hard refresh.
   */
  resetKey: number
  /** Reset all client-side demo state back to its initial values. */
  reset: () => void
  /**
   * Whether the org is entitled to paid features right now (an active
   * subscription, Stripe's own trialing status, or still inside the
   * pre-Stripe free trial window). components/billing-gate.tsx is the
   * only consumer that should actually act on this — see that file.
   */
  billingEntitled: boolean
  billingStatus: string
  billingIsOnFreeTrial: boolean
  billingTrialEndsAt: string | null
}

// Used only when there's no real estimate to back these fields yet — a
// signed-out visitor, a user with no org membership, or an org with no
// projects. See lib/project-state-actions.ts for how the real values are
// resolved.
const FALLBACK_SNAPSHOT_DATE = "Jul 9, 2026"

const ProjectStateContext = React.createContext<ProjectStateValue | null>(null)

export function ProjectStateProvider({
  children,
  initialProjectState,
}: {
  children: React.ReactNode
  initialProjectState: ProjectStateSnapshot | null
}) {
  const [resetKey, setResetKey] = React.useState(0)

  const [costSetupComplete, setCostSetupCompleteState] = React.useState(
    initialProjectState?.costSetupComplete ?? false,
  )
  const [rateSnapshotDate, setRateSnapshotDate] = React.useState(
    initialProjectState?.estimate?.rateSnapshotDate ?? FALLBACK_SNAPSHOT_DATE,
  )
  const [rateDrift, setRateDrift] = React.useState(
    initialProjectState?.estimate?.rateDrift ?? false,
  )
  const [driftDismissed, setDriftDismissed] = React.useState(
    initialProjectState?.estimate?.driftDismissed ?? false,
  )
  const [recalculated, setRecalculated] = React.useState(
    initialProjectState?.estimate?.recalculated ?? false,
  )

  // Whether there's a real estimate row to persist against. Fields still
  // update locally without one (e.g. no projects yet) — they just don't
  // survive a refresh, same as before this step.
  const estimateIdRef = React.useRef(initialProjectState?.estimate?.id ?? null)

  const setCostSetupComplete = React.useCallback((value: boolean) => {
    setCostSetupCompleteState(value)
    setCostSetupCompleteAction(value).catch(() => {})
  }, [])

  const triggerRateDrift = React.useCallback(() => {
    setRateDrift(true)
    setDriftDismissed(false)
    if (estimateIdRef.current) {
      triggerRateDriftAction(estimateIdRef.current).catch(() => {})
    }
  }, [])

  const dismissDrift = React.useCallback(() => {
    setDriftDismissed(true)
    if (estimateIdRef.current) {
      dismissDriftAction(estimateIdRef.current).catch(() => {})
    }
  }, [])

  const recalculate = React.useCallback(() => {
    setRateSnapshotDate(formatDisplayDate(todayIsoDate()))
    setRateDrift(false)
    setDriftDismissed(false)
    setRecalculated(true)
    if (estimateIdRef.current) {
      recalculateAction(estimateIdRef.current).catch(() => {})
    }
  }, [])

  const reset = React.useCallback(() => {
    setCostSetupCompleteState(false)
    setRateSnapshotDate(FALLBACK_SNAPSHOT_DATE)
    setRateDrift(false)
    setDriftDismissed(false)
    setRecalculated(false)
    setResetKey((k) => k + 1)
    resetProjectStateAction(estimateIdRef.current).catch(() => {})
  }, [])

  const value = React.useMemo<ProjectStateValue>(
    () => ({
      currentProjectId: initialProjectState?.currentProjectId ?? null,
      currentProjectName: initialProjectState?.currentProjectName ?? null,
      currentProjectNumber: initialProjectState?.currentProjectNumber ?? null,
      currentProjectDaysOut: initialProjectState?.currentProjectDaysOut ?? null,
      user: initialProjectState?.user ?? { name: "", email: "", initials: "?" },
      orgName: initialProjectState?.orgName ?? "",
      attentionCount: initialProjectState?.reconciliationAttentionCount ?? 0,
      costSetupComplete,
      setCostSetupComplete,
      rateSnapshotDate,
      rateDrift,
      triggerRateDrift,
      driftDismissed,
      dismissDrift,
      recalculated,
      recalculate,
      resetKey,
      reset,
      // Fails open (true) when there's no snapshot to read — a transient
      // DB blip shouldn't lock a paying customer out of their own
      // workspace. The real gate is whatever getBillingStatus() actually
      // computes whenever the snapshot *does* load; this default only
      // ever applies to the "couldn't even check" case, not "checked and
      // it's expired."
      billingEntitled: initialProjectState?.billing.isEntitled ?? true,
      billingStatus: initialProjectState?.billing.status ?? "none",
      billingIsOnFreeTrial: initialProjectState?.billing.isOnFreeTrial ?? false,
      billingTrialEndsAt: initialProjectState?.billing.trialEndsAt ?? null,
    }),
    [
      initialProjectState,
      costSetupComplete,
      setCostSetupComplete,
      rateSnapshotDate,
      rateDrift,
      triggerRateDrift,
      driftDismissed,
      dismissDrift,
      recalculated,
      recalculate,
      resetKey,
      reset,
    ],
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
