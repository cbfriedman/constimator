"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { RequestReviewCard } from "@/components/review/request-review-card"
import { ReviewDetail } from "@/components/review/review-detail"
import { demoProject } from "@/lib/demo-data"

export default function ReviewPage() {
  const router = useRouter()
  // Default to State B so the demo shows content.
  const [inReview, setInReview] = React.useState(true)

  return (
    <div className="flex flex-col">
      <div className="border-b bg-card px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-balance">Human Review</h1>
            <p className="text-sm text-muted-foreground">
              {demoProject.name} · #{demoProject.number}
            </p>
          </div>
          {inReview ? (
            <button
              type="button"
              onClick={() => setInReview(false)}
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Reset demo
            </button>
          ) : null}
        </div>
      </div>

      <div className="px-8 py-6">
        {inReview ? (
          <ReviewDetail />
        ) : (
          <RequestReviewCard
            onRequest={() => {
              setInReview(true)
              toast.success("Human review requested — assigned to Dan Whitfield, P.E.")
            }}
          />
        )}
      </div>

      <div className="sticky bottom-0 mt-auto flex items-center justify-between gap-3 border-t bg-card/95 px-8 py-4 backdrop-blur">
        <Button
          variant="outline"
          onClick={() => router.push("/reconciliation")}
        >
          Back to Reconciliation
        </Button>
        <Button onClick={() => router.push("/reports")}>Generate Reports</Button>
      </div>
    </div>
  )
}
