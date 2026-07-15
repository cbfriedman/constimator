"use client"

import * as React from "react"
import { Check, History } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { StatusPipeline } from "@/components/review/status-pipeline"
import { useProjectState } from "@/components/project-state-provider"

type Comment = {
  id: string
  item: string
  body: string
}

const comments: Comment[] = [
  {
    id: "item-8",
    item: 'Item 8 — 18" RCP',
    body: "Plan profile on C-301 totals 655 LF including inlet connections; the bid form's 640 LF excludes 15 LF inside structures per Spec 71-2.02. Recommend bidding 640 LF.",
  },
  {
    id: "item-13",
    item: "Item 13 — Signs",
    body: "Sign schedule on C-602 includes one relocated sign not in the bid item. Bid 14; flag the relocation as a potential RFI.",
  },
  {
    id: "item-12",
    item: "Item 12 — Markings",
    body: "Verified 1,850 SF against legend details. The confidence issue was a scan artifact.",
  },
]

const revisionHistory = [
  {
    time: "Jul 10, 2:14 PM",
    text: "Item 8 qty 655 → 640",
    meta: "Reviewed — D. Whitfield",
  },
  {
    time: "Jul 10, 2:16 PM",
    text: "Item 12 marked Reviewed",
    meta: "D. Whitfield",
  },
  {
    time: "Jul 10, 2:21 PM",
    text: "Item 13 RFI drafted",
    meta: "D. Whitfield",
  },
  {
    time: "Jul 9, 4:02 PM",
    text: "Review requested",
    meta: "M. Torres",
  },
]

export function ReviewDetail() {
  const { recalculated } = useProjectState()
  const [reviewed, setReviewed] = React.useState<Record<string, boolean>>({})

  const history = recalculated
    ? [
        {
          time: "Jul 14, 10:05 AM",
          text: "Estimate recalculated with current rates",
          meta: "M. Torres",
        },
        ...revisionHistory,
      ]
    : revisionHistory

  function applyRecommendation(comment: Comment) {
    setReviewed((prev) => ({ ...prev, [comment.id]: true }))
    toast.success(`Recommendation applied — ${comment.item}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Review Status</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusPipeline />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 py-5">
          <Avatar className="size-12">
            <AvatarFallback className="bg-primary/10 text-primary">
              DW
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Dan Whitfield, P.E.</span>
            <span className="text-sm text-muted-foreground">
              22 yrs civil estimating · Assigned Jul 10
            </span>
          </div>
          <Badge
            variant="outline"
            className="ml-auto border-primary/30 bg-primary/10 text-primary"
          >
            In review
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reviewer Comments</CardTitle>
          <CardDescription>
            Apply a recommendation to record it as reviewed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {comments.map((comment) => {
            const isReviewed = reviewed[comment.id]
            return (
              <div
                key={comment.id}
                className="flex flex-col gap-3 rounded-lg border bg-card p-4"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">
                      DW
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{comment.item}</span>
                  {isReviewed ? (
                    <Badge
                      variant="outline"
                      className="ml-auto border-review/30 bg-review/10 text-review"
                    >
                      <Check className="size-3" data-icon="inline-start" />
                      Reviewed
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {comment.body}
                </p>
                <div>
                  <Button
                    variant={isReviewed ? "outline" : "secondary"}
                    size="sm"
                    disabled={isReviewed}
                    onClick={() => applyRecommendation(comment)}
                  >
                    {isReviewed ? "Recommendation applied" : "Apply Recommendation"}
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            Revision History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col">
            {history.map((entry, index) => (
              <li key={entry.time + entry.text} className="flex flex-col">
                <div className="flex items-baseline gap-3 py-2">
                  <span className="w-32 shrink-0 text-xs text-muted-foreground">
                    {entry.time}
                  </span>
                  <span className="flex-1 text-sm">{entry.text}</span>
                  <span className="text-xs text-muted-foreground">
                    {entry.meta}
                  </span>
                </div>
                {index < history.length - 1 ? <Separator /> : null}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
