import path from "node:path"
import { createRequire } from "node:module"

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"

import type { PdfPageText } from "./select-spec-pages.js"
import { logger } from "./logger.js"

// Text extraction, as against rasterize.ts's image rendering. Both read a PDF
// and they are not interchangeable: a plan sheet IS a drawing, so the takeoff
// needs pixels, while a spec book is prose and the two things we want out of
// it — a percentage and a URL — are exact character data that rasterizing
// throws away.
//
// pdfjs-dist is already resolved in this worker as pdf-to-img's own
// dependency; worker/package.json now declares it directly rather than
// reaching through another package's tree for it.

// Without this pdf.js logs "Ensure that the `standardFontDataUrl` API
// parameter is provided" on any document using the base-14 fonts, which is
// most of them. It isn't only log noise: the font data is what maps glyphs
// back to unicode, so a document that needs it and doesn't get it can extract
// as mojibake. Resolved from the installed package rather than hardcoded so
// it survives a hoisted or relocated node_modules.
//
// Despite the name pdf.js wants a filesystem path here, not a URL, and it
// rejects one that doesn't end in a forward slash. Both halves of that bite
// on Windows: a file:// URL loads nothing (silently degrading to substituted
// fonts), and a path built with path.sep fails validation outright. Hence
// backslashes rewritten and the slash appended by hand.
const require = createRequire(import.meta.url)
const STANDARD_FONT_DATA_URL = `${path
  .dirname(require.resolve("pdfjs-dist/package.json"))
  .replaceAll("\\", "/")}/standard_fonts/`

/**
 * Reads a PDF's text layer, one entry per page, in document order.
 *
 * Returns pages with empty text rather than dropping them — a scanned
 * document is a real case (selectSpecPages decides what to do about it), and
 * page numbers have to stay aligned with the document for a cited sourcePage
 * to mean anything.
 */
export async function extractPdfPageText(pdfBytes: Buffer): Promise<PdfPageText[]> {
  // A copy, not a view: pdf.js transfers ownership of the buffer it is handed
  // and detaches it. Handing it `fileBytes` directly would leave the caller
  // holding a zero-length buffer — which the PDF-block fallback path in
  // extract-participation-goals.ts then needs to send.
  const data = new Uint8Array(pdfBytes)

  const doc = await getDocument({
    data,
    // No eval and no system fonts: this runs on downloaded, untrusted
    // documents, and neither buys anything when the output is text.
    isEvalSupported: false,
    useSystemFonts: false,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
  }).promise

  try {
    const pages: PdfPageText[] = []
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber)
      try {
        const content = await page.getTextContent()
        // pdf.js emits one item per text run, with hasEOL marking a line
        // break. Joining on that keeps clauses on their own lines, which is
        // what makes a percentage read as belonging to the sentence beside it
        // rather than to whatever ran across the page in the same band.
        const text = content.items
          .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : " ") : ""))
          .join("")
        pages.push({ pageNumber, text })
      } finally {
        page.cleanup()
      }
    }
    return pages
  } finally {
    await doc.destroy()
  }
}

/**
 * extractPdfPageText, but a failure to parse is not fatal. A malformed or
 * encrypted PDF still has the PDF-document-block path open to it, and that
 * path handles some documents pdf.js won't parse — so a caller that can fall
 * back should, rather than failing the job outright.
 */
export async function tryExtractPdfPageText(pdfBytes: Buffer): Promise<PdfPageText[] | null> {
  try {
    return await extractPdfPageText(pdfBytes)
  } catch (err) {
    logger.warn("PDF text extraction failed — falling back to sending the document", {
      reason: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}
