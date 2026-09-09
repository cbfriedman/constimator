"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { importExtractedBidFormAction } from "@/app/reconciliation/actions"
import {
  LOW_CONFIDENCE,
  filterSkipped,
  itemKeys,
  type PendingBidFormExtraction,
} from "@/lib/bid-form-import"
import { cn } from "@/lib/utils"

export function BidFormImportCard({
  projectId,
  hasExistingBidForm,
  extractions,
  onImported,
}: {
  projectId: string
  hasExistingBidForm: boolean
  extractions: PendingBidFormExtraction[]
  /**
   * Fired before the refresh that unmounts this card. Anything the
   * contractor should be offered *after* an import has to live in the
   * parent: once the bid rows exist, this document is no longer pending
   * and the card renders null.
   */
  onImported?: (result: { imported: number }) => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const [skippedItemKeys, setSkippedItemKeys] = useState<Set<string>>(
    () => new Set(),
  )
  const extraction = extractions[0]
  // The same keys back the React key and the skip set, so a row can never be
  // flagged under one identity and imported under another.
  const keys = useMemo(() => itemKeys(extraction?.items ?? []), [extraction])
  if (!extraction) return null

  const selectedCount = extraction.items.length - skippedItemKeys.size

  function toggleSkipped(key: string) {
    setSkippedItemKeys((current) => {
      const next = new Set(current)
      if (!next.delete(key)) next.add(key)
      return next
    })
  }

  async function handleImport(replaceExisting: boolean) {
    setPending(replaceExisting ? "replace" : "import")
    try {
      const result = await importExtractedBidFormAction({
        projectId,
        documentId: extraction.documentId,
        replaceExisting,
        items: filterSkipped(extraction.items, skippedItemKeys),
      })
      toast.success(`Imported ${result.imported} bid-form items. Review them below.`)
      onImported?.(result)
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
          Uncheck any row you don&apos;t want — you can still edit the rest after import.
        </p>
        <div className="max-h-64 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead className="w-12">#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-16">Unit</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="w-16 text-right">Conf</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extraction.items.map((item, index) => {
                const key = keys[index]!
                const skipped = skippedItemKeys.has(key)
                const lowConfidence =
                  item.confidence != null && item.confidence < LOW_CONFIDENCE
                return (
                  <TableRow key={key} className={cn(skipped && "opacity-50")}>
                    <TableCell>
                      <Checkbox
                        checked={!skipped}
                        onCheckedChange={() => toggleSkipped(key)}
                        aria-label={`Import item ${item.itemNumber}`}
                      />
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {item.itemNumber}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.description}
                      {item.sourcePage != null ? (
                        <span className="block text-xs font-normal text-muted-foreground">
                          p.{item.sourcePage}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        lowConfidence ? "text-warning" : "text-muted-foreground",
                      )}
                    >
                      {item.confidence == null ? "—" : item.confidence}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.notes ?? null}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {hasExistingBidForm ? (
            <Button
              variant="outline"
              disabled={pending !== null || selectedCount === 0}
              onClick={() => handleImport(true)}
            >
              {pending === "replace" ? "Replacing…" : "Replace existing bid form"}
            </Button>
          ) : (
            <Button
              disabled={pending !== null || selectedCount === 0}
              onClick={() => handleImport(false)}
            >
              {pending === "import" ? "Importing…" : `Import ${selectedCount} items`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
