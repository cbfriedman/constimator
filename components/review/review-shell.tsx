"use client"

import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { BidCountdownBadge } from "@/components/bid-countdown-badge"
import { RequestReviewCard } from "@/components/review/request-review-card"
import { ReviewStatusCard } from "@/components/review/review-status-card"

type ReviewRequestView = {
  scope: string[]
  notes: string | null
  status: string
  createdAt: Date
}

export function ReviewShell({
  project,
  initialRequest,
}: {
  project: { id: string; name: string; number: string }
  initialRequest: ReviewRequestView | null
}) {
  const router = useRouter()
  const request = initialRequest

  return (
    <div className="flex flex-col">
      <div className="border-b bg-card px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-balance">
                Human Review
              </h1>
              <BidCountdownBadge />
            </div>
            <p className="text-sm text-muted-foreground">
              {project.name} · #{project.number}
            </p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {request ? (
          <ReviewStatusCard
            scope={request.scope}
            notes={request.notes}
            status={request.status}
            createdAt={request.createdAt}
          />
        ) : (
          <RequestReviewCard
            projectId={project.id}
            onRequested={() => router.refresh()}
          />
        )}
      </div>

      <div className="sticky bottom-0 mt-auto flex items-center justify-between gap-3 border-t bg-card/95 px-8 py-4 backdrop-blur">
        <Button variant="outline" onClick={() => router.push("/reconciliation")}>
          Back to Reconciliation
        </Button>
        <Button onClick={() => router.push("/reports")}>Generate Reports</Button>
      </div>
    </div>
  )
}
