import { pdf } from "pdf-to-img"

import { logger } from "./logger.js"

export type RasterizedPage = {
  pageNumber: number
  base64: string
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
 */
export async function rasterizePdf(pdfBytes: Buffer): Promise<RasterizedPage[]> {
  const doc = await pdf(pdfBytes, { scale: 2 })

  const pageCount = doc.length
  if (pageCount > MAX_PAGES) {
    logger.warn("Document exceeds max pages — capping extraction", { pageCount, maxPages: MAX_PAGES })
  }

  const pages: RasterizedPage[] = []
  for (let pageNumber = 1; pageNumber <= Math.min(pageCount, MAX_PAGES); pageNumber++) {
    const buffer = await doc.getPage(pageNumber)
    pages.push({ pageNumber, base64: buffer.toString("base64") })
  }

  await doc.destroy()
  return pages
}
