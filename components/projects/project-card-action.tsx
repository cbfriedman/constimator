"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { useProjectState } from "@/components/project-state-provider"

export function ProjectCardAction({
  href,
  buttonLabel,
  projectId,
}: {
  href: string
  buttonLabel: string
  isProjectScoped?: boolean
  isCurrent?: boolean
  projectId: string
}) {
  const router = useRouter()
  const { selectProject } = useProjectState()

  return (
    <Button
      className="w-full"
      variant="outline"
      render={<Link href={href} />}
      onClick={() => {
        selectProject(projectId).then(() => router.refresh())
      }}
    >
      {buttonLabel}
    </Button>
  )
}
