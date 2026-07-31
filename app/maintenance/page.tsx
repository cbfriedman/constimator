import { Wrench } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function MaintenancePage() {
  return (
    <div className="flex min-h-svh flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Wrench className="size-5 text-primary" />
          </div>
          <CardTitle className="text-xl">We&apos;ll be back soon</CardTitle>
          <CardDescription>
            Constimator is undergoing scheduled maintenance. Thanks for your
            patience — check back shortly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Questions? Reach out at{" "}
            <a
              href="mailto:coby@cfcontracting.com"
              className="underline underline-offset-4"
            >
              coby@cfcontracting.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
