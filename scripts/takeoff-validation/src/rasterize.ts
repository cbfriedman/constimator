import { pdf } from "pdf-to-img"

export type RasterizedPage = {
  pageNumber: number
  base64: string
}

// Above this, a single Claude request gets unwieldy (payload size, and
// realistically how many sheets someone can sanity-check by eye anyway).
// Not a hard API limit — just where this script draws the line for now.
const MAX_PAGES = 20

/**
 * Rasterizes a PDF to PNG images, base64-encoded for the Claude API.
 * @param pageFilter 1-indexed page numbers to include; omit for all pages.
 */
export async function rasterizePdf(
  pdfPath: string,
  pageFilter?: number[],
): Promise<RasterizedPage[]> {
  const doc = await pdf(pdfPath, { scale: 2 })

  const pageNumbers =
    pageFilter ?? Array.from({ length: doc.length }, (_, i) => i + 1)

  if (pageNumbers.length > MAX_PAGES) {
    console.warn(
      `  ⚠ ${pageNumbers.length} pages requested, capping at ${MAX_PAGES}. ` +
        `Narrow this plan set's "pages" field in known-quantities.json to the sheets that actually matter.`,
    )
  }

  const pagesToRender = pageNumbers.slice(0, MAX_PAGES)
  const pages: RasterizedPage[] = []

  for (const pageNumber of pagesToRender) {
    const buffer = await doc.getPage(pageNumber)
    pages.push({ pageNumber, base64: buffer.toString("base64") })
  }

  await doc.destroy()
  return pages
}
