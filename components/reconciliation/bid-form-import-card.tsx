"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { importExtractedBidFormAction } from "@/app/reconciliation/actions"
import type { PendingBidFormExtraction } from "@/lib/bid-form-import"

export function BidFormImportCard({
  projectId,
  hasExistingBidForm,
  extractions,
}: {
  projectId: string
  hasExistingBidForm: boolean
  extractions: PendingBidFormExtraction[]
}) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const extraction = extractions[0]
  if (!extraction) return null

  async function handleImport(replaceExisting: boolean) {
    setPending(replaceExisting ? "replace" : "import")
    try {
      const result = await importExtractedBidFormAction({
        projectId,
        documentId: extraction.documentId,
        replaceExisting,
        items: extraction.items,
      })
      toast.success(`Imported ${result.imported} bid-form items. Review them below.`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't import that — try again.")
    } finally {
      setPending(null)
    }
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          Extracted bid form ready to import
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          AI read {extraction.items.length} line items from{" "}
          <span className="font-medium text-foreground">{extraction.fileName}</span>.
          Confirm they look right, then import them as the official bid form.
          You can still edit any row after import.
        </p>
        <div className="max-h-64 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-16">Unit</TableHead>
                <TableHead className="text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extraction.items.map((item) => (
                <TableRow key={item.itemNumber + item.description}>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {item.itemNumber}
                  </TableCell>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {hasExistingBidForm ? (
            <Button
              variant="outline"
              disabled={pending !== null}
              onClick={() => handleImport(true)}
            >
              {pending === "replace" ? "Replacing…" : "Replace existing bid form"}
            </Button>
          ) : (
            <Button disabled={pending !== null} onClick={() => handleImport(false)}>
              {pending === "import"
                ? "Importing…"
                : `Import ${extraction.items.length} items`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
