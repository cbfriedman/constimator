"use client"

import { usePathname } from "next/navigation"
import { CreditCard } from "lucide-react"

import { createCheckoutSessionAction } from "@/app/billing/actions"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useProjectState } from "@/components/project-state-provider"

// Pages that stay reachable without an active subscription — the org
// still needs to see its own dashboard, manage its project list, reach
// /billing to actually subscribe, and manage /team regardless of
// subscription state (a lapsed org shouldn't lose the ability to see who
// has access or revoke an invite). Everything else inside the
// authenticated sidebar shell is a paid feature. This is a page-level
// gate (UX, not the security boundary) — the one action that actually
// spends money (queuing an AI takeoff job) checks billing status again
// itself in app/upload/actions.ts, same "don't trust the page already
// checked it" lesson step 30 covered for org isolation.
const EXEMPT_PATHS = new Set(["/dashboard", "/projects", "/projects/new", "/billing", "/team"])

export function BillingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { billingEntitled, billingTrialEndsAt } = useProjectState()

  const isExempt = EXEMPT_PATHS.has(pathname) || pathname.startsWith("/projects/")
  if (isExempt || billingEntitled) {
    return <>{children}</>
  }

  // billingEntitled is false here, which also means the pre-Stripe free
  // trial (isOnFreeTrial) is false — entitled is defined as "on that trial
  // OR an active/trialing subscription," so if we've reached this branch
  // the trial window is the thing that ran out.
  const trialEndedLabel = billingTrialEndsAt
    ? new Date(billingTrialEndsAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Empty className="max-w-md border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CreditCard />
          </EmptyMedia>
          <EmptyTitle>Subscribe to continue</EmptyTitle>
          <EmptyDescription>
            {trialEndedLabel
              ? `Your free trial ended ${trialEndedLabel}. Subscribe to keep using Constimator's estimating workspace.`
              : "Subscribe to keep using Constimator's estimating workspace."}
          </EmptyDescription>
        </EmptyHeader>
        <form action={createCheckoutSessionAction}>
          <Button type="submit">
            <CreditCard data-icon="inline-start" />
            Subscribe
          </Button>
        </form>
      </Empty>
    </div>
  )
}
