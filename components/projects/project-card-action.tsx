"use client"

import Link from "next/link"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

// /intelligence, /estimate, and /reconciliation aren't project-scoped yet
// (see lib/projects.ts's PROJECT_SCOPED_PATHS comment) — they always show
// the org's current project regardless of which id is in the URL. A plain
// link on one of those cards for a non-current project would silently
// open a different project's data with no indication anything's wrong, so
// those cards show a toast instead — same gating as the dashboard's
// project table (components/dashboard/dashboard-shell.tsx).
export function ProjectCardAction({
  href,
  buttonLabel,
  isProjectScoped,
  isCurrent,
}: {
  href: string
  buttonLabel: string
  isProjectScoped: boolean
  isCurrent: boolean
}) {
  if (isProjectScoped || isCurrent) {
    return (
      <Button className="w-full" variant="outline" render={<Link href={href} />}>
        {buttonLabel}
      </Button>
    )
  }

  return (
    <Button
      className="w-full"
      variant="outline"
      onClick={() =>
        toast.info(
          "This project isn't wired up yet — Constimator currently works with your most recently created project.",
        )
      }
    >
      {buttonLabel}
    </Button>
  )
}
