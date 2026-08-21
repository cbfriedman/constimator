"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import type { TextItem } from "pdfjs-dist/types/src/display/api"

import { findTextInItems, type TextMatch } from "@/lib/pdf-text-match"

// Renders one page of the quote and highlights the words an extracted
// condition was read from.
//
// pdf.js rather than the browser's built-in viewer because an <iframe> can be
// navigated but not drawn on, and the whole point here is to show *which*
// words on the page a condition came from. The position comes from the PDF's
// own text layer via lib/pdf-text-match.ts — never from a model — so a
// highlight only appears where the document itself says those words are.

export type HighlightState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "found"; quality: TextMatch["quality"] }
  | { status: "not_found" }
  | { status: "no_text_layer" }

type Rect = { left: number; top: number; width: number; height: number }

/** Rendering wider than this gains nothing on screen and costs memory on long quotes. */
const RENDER_SCALE = 1.6

export function PdfViewer({
  url,
  page,
  query,
  onHighlightChange,
}: {
  url: string
  page: number
  query: string | null
  onHighlightChange?: (state: HighlightState) => void
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const highlightRef = React.useRef<HTMLSpanElement | null>(null)

  const [rects, setRects] = React.useState<Rect[]>([])
  const [pageCount, setPageCount] = React.useState<number | null>(null)
  const [size, setSize] = React.useState<{ width: number; height: number } | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Kept in a ref so the render effect doesn't re-run when the callback
  // identity changes on the parent's re-render.
  const reportRef = React.useRef(onHighlightChange)
  React.useEffect(() => {
    reportRef.current = onHighlightChange
  }, [onHighlightChange])

  React.useEffect(() => {
    let cancelled = false
    // Every state update below is inside an async continuation, so nothing is
    // set synchronously during the effect body.
    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist")
        // The worker has to be resolved as an asset URL rather than imported,
        // and it must be set before getDocument runs.
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.mjs",
          import.meta.url,
        ).toString()

        const doc = await pdfjs.getDocument({ url }).promise
        if (cancelled) return
        setPageCount(doc.numPages)

        const targetPage = Math.min(Math.max(page, 1), doc.numPages)
        const pdfPage = await doc.getPage(targetPage)
        if (cancelled) return

        const viewport = pdfPage.getViewport({ scale: RENDER_SCALE })
        const canvas = canvasRef.current
        if (!canvas) return

        canvas.width = viewport.width
        canvas.height = viewport.height
        setSize({ width: viewport.width, height: viewport.height })

        const context = canvas.getContext("2d")
        if (!context) return
        await pdfPage.render({ canvas, canvasContext: context, viewport }).promise
        if (cancelled) return
        setLoading(false)

        const textContent = await pdfPage.getTextContent()
        if (cancelled) return

        // getTextContent returns TextItem | TextMarkedContent; only the former
        // carries a string and a position, and the marked-content entries are
        // structural markers with nothing to highlight.
        const items = textContent.items.filter(
          (item): item is TextItem => "str" in item && "transform" in item,
        )

        // A scanned page carries no text layer at all. Saying so is different
        // from "the words weren't found", and the caller words it differently.
        if (items.length === 0) {
          setRects([])
          reportRef.current?.({ status: "no_text_layer" })
          return
        }

        if (!query) {
          setRects([])
          reportRef.current?.({ status: "idle" })
          return
        }

        const match = findTextInItems(items, query)
        if (!match) {
          setRects([])
          reportRef.current?.({ status: "not_found" })
          return
        }

        setRects(
          match.itemIndices.map((index) => {
            const item = items[index]
            const tx = pdfjs.Util.transform(viewport.transform, item.transform)
            // The glyph height falls out of the transform's scale/skew terms;
            // item.height is unreliable for rotated or scaled text.
            const fontHeight = Math.hypot(tx[2], tx[3])
            return {
              left: tx[4],
              top: tx[5] - fontHeight,
              width: item.width * RENDER_SCALE,
              height: fontHeight,
            }
          }),
        )
        reportRef.current?.({ status: "found", quality: match.quality })
      } catch (err) {
        if (cancelled) return
        setLoading(false)
        setError(err instanceof Error ? err.message : "Could not display this document.")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [url, page, query])

  // Bring the first highlighted run into view once it has been positioned.
  React.useEffect(() => {
    if (rects.length === 0) return
    highlightRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [rects])

  return (
    <div ref={containerRef} className="relative h-full overflow-auto bg-muted">
      {error ? (
        <div className="flex h-full items-center justify-center p-6 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : null}

      {loading && !error ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      <div className="relative mx-auto w-fit" style={size ? { width: size.width } : undefined}>
        <canvas ref={canvasRef} className="block max-w-full" />
        {rects.map((rect, index) => (
          <span
            key={`${rect.left}-${rect.top}-${index}`}
            ref={index === 0 ? highlightRef : undefined}
            aria-hidden="true"
            className="pointer-events-none absolute rounded-xs bg-caution opacity-40"
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            }}
          />
        ))}
      </div>

      {pageCount != null && pageCount > 1 && !loading && !error ? (
        <p className="sticky bottom-0 bg-muted py-1 text-center text-xs text-muted-foreground tabular-nums">
          Page {Math.min(Math.max(page, 1), pageCount)} of {pageCount}
        </p>
      ) : null}
    </div>
  )
}
