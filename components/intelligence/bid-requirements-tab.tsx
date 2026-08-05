import { Info } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { IntelligenceProjectView } from "@/app/intelligence/actions"

export function BidRequirementsTab({
  project,
}: {
  project: IntelligenceProjectView
}) {
  const requirements = [
    {
      item: "Prevailing Wage",
      detail: project.prevailingWage
        ? "Required on this project"
        : "Not required on this project",
    },
    project.bidDate && { item: "Bid Deadline", detail: project.bidDate },
    project.workingDays != null && {
      item: "Contract Time",
      detail: `${project.workingDays} working days`,
    },
    project.liquidatedDamagesPerDay && {
      item: "Liquidated Damages",
      detail: project.liquidatedDamagesPerDay,
    },
  ].filter(Boolean) as { item: string; detail: string }[]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bid Requirements</CardTitle>
        <CardDescription>
          What&apos;s on file for this project.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[35%]">Requirement</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requirements.map((req) => (
              <TableRow key={req.item}>
                <TableCell className="font-medium">{req.item}</TableCell>
                <TableCell className="text-muted-foreground">{req.detail}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Submission-level requirements — bid bonds, licensing, subcontractor
          listing thresholds, required declarations — aren&apos;t extracted
          from your documents yet. Check the official bid form and
          specifications directly for those.
        </p>
      </CardContent>
    </Card>
  )
}
