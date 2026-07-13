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
import { SourceChip } from "@/components/intelligence/source-reference"

const requirements = [
  {
    item: "Bid Bond",
    detail: "10% of bid amount",
    source: "Spec 00 21 13 p.4",
  },
  {
    item: "Contractor License",
    detail: "Class A required",
    source: "Notice to Bidders p.1",
  },
  {
    item: "Acknowledgment of Addenda",
    detail: "Addendum 01 must be acknowledged on bid form",
    source: "Bid Form p.2",
  },
  {
    item: "Subcontractor Listing",
    detail: "Subs > 0.5% must be listed",
    source: "Spec 00 43 36",
  },
  {
    item: "Prevailing Wage",
    detail: "CA DIR rates; certified payroll required",
    source: "Spec 00 73 43",
  },
  {
    item: "Non-Collusion Declaration",
    detail: "Notarized, submitted with bid",
    source: "Bid Form p.8",
  },
]

export function BidRequirementsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bid Requirements Checklist</CardTitle>
        <CardDescription>
          Submission requirements extracted from the specifications and bid
          form.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%]">Requirement</TableHead>
              <TableHead>Detail</TableHead>
              <TableHead className="w-[22%]">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requirements.map((req) => (
              <TableRow key={req.item}>
                <TableCell className="font-medium">{req.item}</TableCell>
                <TableCell className="text-muted-foreground">
                  {req.detail}
                </TableCell>
                <TableCell>
                  <SourceChip label={req.source} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
