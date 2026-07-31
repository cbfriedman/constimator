import Link from "next/link"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export function NoProjectState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <Alert variant="destructive">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
      <Button className="mt-4" render={<Link href="/projects" />}>
        Go to Projects
      </Button>
    </div>
  )
}
