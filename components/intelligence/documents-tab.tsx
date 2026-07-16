"use client"

import { Eye, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useSourceReference } from "@/components/intelligence/source-reference"

const documents = [
  { name: "Plans.pdf", detail: "64 sheets" },
  { name: "Specifications.pdf", detail: "412 pp" },
  { name: "Addendum_01.pdf", detail: "6 pp" },
  { name: "Official_Bid_Form.pdf", detail: "9 pp" },
  { name: "Geotechnical_Report.pdf", detail: "48 pp" },
]

export function DocumentsTab() {
  const { openSource } = useSourceReference()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Documents</CardTitle>
        <CardDescription>
          Source files analyzed for this project.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y">
          {documents.map((doc) => (
            <li
              key={doc.name}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md border bg-muted/40">
                  <FileText className="size-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {doc.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {doc.detail}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openSource(doc.name)}
              >
                <Eye data-icon="inline-start" />
                View
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
