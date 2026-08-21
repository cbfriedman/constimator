"use client"

import * as React from "react"
import { FileWarning, Loader2 } from "lucide-react"

import { getSubQuoteDocumentUrl } from "@/app/sub-quotes/actions"
import { PdfViewer, type HighlightState } from "@/components/sub-quotes/pdf-viewer"
import { Button } from "@/components/ui/button"

/**
 * The original quote, shown beside the extracted conditions so a reading can
 * be confirmed against the page it came from.
 *
 * Selecting a condition finds its verbatim wording in the PDF's own text layer
 * and highlights those words (lib/pdf-text-match.ts). Nothing here estimates
 * where the text is — the position is the document's own, so a highlight can't
 * point at the wrong line. When the words can't be located confidently, the
 * pane says so and falls back to the page plus the verbatim callout, which is
 * the honest answer rather than a guess.
 */
export function DocumentPane({
  subQuoteId,
  fileName,
  mimeType,
  activePage,
  activeText,
  activeBoundingBox,
}: {
  subQuoteId: string
  fileName: string
  mimeType: string | null
  activePage: number | null
  activeText: string | null
  activeBoundingBox: [number, number, number, number] | null
}) {
  const [url, setUrl] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [highlight, setHighlight] = React.useState<HighlightState>({ status: "idle" })

  // Both state updates happen in the promise callbacks rather than
  // synchronously, so this is safe to call straight from an effect.
  const load = React.useCallback(() => {
    getSubQuoteDocumentUrl(subQuoteId)
      .then((signedUrl) => {
        setUrl(signedUrl)
        setError(null)
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Could not open this document."),
      )
  }, [subQuoteId])

  React.useEffect(() => {
    load()
    // The signed URL lasts 15 minutes (app/sub-quotes/actions.ts); refresh
    // well before that so a long review never hits a dead link.
    const timer = setInterval(load, 12 * 60 * 1000)
    return () => clearInterval(timer)
  }, [load])

  const isImage = mimeType?.startsWith("image/") ?? false

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-medium text-foreground" title={fileName}>
          {fileName}
        </span>
        {activePage ? (
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            Page {activePage}
          </span>
        ) : null}
      </div>

      {activeText ? (
        <div className="shrink-0 rounded-lg border border-caution bg-caution p-3 text-caution-foreground">
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">Source text</p>
          <p className="mt-1 text-sm leading-relaxed">&ldquo;{activeText}&rdquo;</p>
          <HighlightNote state={highlight} isImage={isImage} />
        </div>
      ) : (
        <p className="shrink-0 text-sm text-muted-foreground">
          Select a condition to jump to where it came from.
        </p>
      )}

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-muted">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <FileWarning className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={load}>
              Try again
            </Button>
          </div>
        ) : !url ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : isImage ? (
          // A photographed or scanned quote has no text layer to search. The
          // stored bounding box is honoured if one ever exists; otherwise the
          // verbatim callout above is what the reader matches by eye.
          <div className="relative h-full overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element -- a Supabase signed URL is not a stable src for next/image, and it changes on every refresh */}
            <img src={url} alt={fileName} className="w-full" />
            {activeBoundingBox ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute border-2 border-caution"
                style={{
                  left: `${activeBoundingBox[0] * 100}%`,
                  top: `${activeBoundingBox[1] * 100}%`,
                  width: `${(activeBoundingBox[2] - activeBoundingBox[0]) * 100}%`,
                  height: `${(activeBoundingBox[3] - activeBoundingBox[1]) * 100}%`,
                }}
              />
            ) : null}
          </div>
        ) : (
          <PdfViewer
            url={url}
            page={activePage ?? 1}
            query={activeText}
            onHighlightChange={setHighlight}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Says how the highlight was arrived at — or why there isn't one. A reader
 * confirming a number needs to know whether the tool located the words or is
 * only showing them the right page.
 */
function HighlightNote({ state, isImage }: { state: HighlightState; isImage: boolean }) {
  if (isImage) {
    return (
      <p className="mt-2 text-xs opacity-80">
        This quote is a scan or photo, so its text can&apos;t be searched — compare the
        wording above against the page yourself.
      </p>
    )
  }

  switch (state.status) {
    case "found":
      return state.quality === "fuzzy" ? (
        <p className="mt-2 text-xs opacity-80">
          Highlighted the closest wording on this page — it differs slightly from the
          text above, so check it.
        </p>
      ) : null
    case "not_found":
      return (
        <p className="mt-2 text-xs opacity-80">
          Couldn&apos;t locate this exact wording on the page — it may appear more than
          once. Showing the page it was read from instead.
        </p>
      )
    case "no_text_layer":
      return (
        <p className="mt-2 text-xs opacity-80">
          This page has no searchable text, so nothing is highlighted — compare the
          wording above against the page yourself.
        </p>
      )
    default:
      return null
  }
}
