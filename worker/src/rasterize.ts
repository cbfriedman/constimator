import { pdf } from "pdf-to-img"

import { logger } from "./logger.js"

export type RasterizedPage = {
  pageNumber: number
  base64: string
}

export type RasterizeResult = {
  pages: RasterizedPage[]
  /** Pages in the source PDF. */
  pageCount: number
  /** Pages actually rendered and sent to Claude — min(pageCount, MAX_PAGES). */
  pagesRead: number
  /** True when pageCount > MAX_PAGES, i.e. the extraction is partial. */
  truncated: boolean
}

// Same limit as scripts/takeoff-validation/src/rasterize.ts — above this a
// single Claude request gets unwieldy (payload size, and how much a human
// reviewer can realistically sanity-check). Real uploads have no page
// filter (that's a scripts/takeoff-validation-only concept for narrowing to
// known-relevant sheets), so this cap is what actually bounds cost here.
const MAX_PAGES = 20

/**
 * Rasterizes a PDF (already downloaded into memory) to PNG images,
 * base64-encoded for the Claude API.
 *
 * Returns how much of the document was actually read, not just the pages.
 * The cap used to be enforced with a `logger.warn` to worker stdout and
 * nothing else: the job still completed, the document still went to
 * "processed", /processing still said "Processing complete", and the estimate
 * was built from the first 20 sheets. A real civil plan set runs 80-150
 * sheets, so a contractor could bid off 11% of the drawings with no
 * indication anything had been skipped. db/schema.ts even had a pageCount
 * column that was never compared against this limit.
 *
 * The caller now persists these numbers on the job result so the app can say
 * it out loud. That is the whole point of returning them — raising MAX_PAGES
 * is a separate (and more expensive) decision, but silently truncating is not
 * defensible either way.
 */
export async function rasterizePdf(pdfBytes: Buffer): Promise<RasterizeResult> {
  const doc = await pdf(pdfBytes, { scale: 2 })

  const pageCount = doc.length
  const pagesRead = Math.min(pageCount, MAX_PAGES)
  const truncated = pageCount > MAX_PAGES
  if (truncated) {
    logger.warn("Document exceeds max pages — capping extraction", { pageCount, maxPages: MAX_PAGES })
  }

  const pages: RasterizedPage[] = []
  for (let pageNumber = 1; pageNumber <= pagesRead; pageNumber++) {
    const buffer = await doc.getPage(pageNumber)
    pages.push({ pageNumber, base64: buffer.toString("base64") })
  }

  await doc.destroy()
  return { pages, pageCount, pagesRead, truncated }
}
