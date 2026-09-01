// Narrows a spec book down to the pages worth sending to Claude.
//
// This is the module that makes reading a real specification possible at all.
// Agency special provisions run 200-800 pages; the participation requirement
// is a paragraph or two, and the address where the documents and the
// certified-firm directory are obtained is a line in the notice to bidders.
// Sending the whole book is impossible past the API's 32MB document limit and
// wasteful well before it, and it buries the two things we're after in
// hundreds of pages of unrelated boilerplate — which costs accuracy, not just
// money.
//
// Deliberately pure and import-free: page selection is the part of this
// feature most likely to be wrong on a document shape nobody anticipated, and
// it's the part that can be tested without a PDF, an API key, or a network.
// See select-spec-pages.test.ts.

/** One page's extracted text. Produced by pdf-text.ts. */
export type PdfPageText = {
  pageNumber: number
  text: string
}

// Matched case-insensitively against each page. Deliberately generous: the
// cost of an extra page in the request is a few thousand tokens, while the
// cost of missing the page that states the goal is the whole feature. Covers
// the abbreviations, the spelled-out programme names, and the surrounding
// language agencies use when they set a goal ("good faith effort" appears in
// essentially every goal clause written against 49 CFR 26).
const GOAL_TERMS = [
  "dbe",
  "udbe",
  "dvbe",
  "sbe",
  "mbe",
  "wbe",
  "lbe",
  "obe",
  "disadvantaged business",
  "disabled veteran",
  "minority business",
  "women business",
  "women-owned",
  "small business enterprise",
  "local business enterprise",
  "underutilized",
  "participation goal",
  "contract goal",
  "good faith effort",
  "49 cfr",
  "certified firms",
  "unified certification",
]

// Where-to-get-it language. A spec prints the directory address and the
// planroom address in the notice to bidders, which often carries no goal term
// at all — so these pages have to be selected on their own terms or the link
// half of the feature never sees the page it lives on.
const LINK_TERMS = [
  "may be obtained",
  "are available at",
  "is available at",
  "can be downloaded",
  "planroom",
  "plan room",
  "bid documents",
  "contract documents",
  "directory",
  "certified firm",
  "obtain",
  "download",
]

const URL_PATTERN = /https?:\/\/|www\./i

// A goal clause states a percentage. A page with a percent sign near a
// programme term is far likelier to be the clause itself than one that merely
// cross-references it, so it outranks in the scoring below.
const PERCENT_PATTERN = /\d\s*(?:%|percent)/i

// The front matter — notice to bidders, notice inviting bids — carries the
// goal and the where-to-obtain line often enough to be worth including
// unconditionally, and it is cheap.
const ALWAYS_INCLUDE_FIRST_PAGES = 2

// Bounds the request. Past this the extra pages are cross-references, not the
// clause. 24 pages of spec text is roughly 30-60k tokens — comfortable, and a
// long way under any limit.
const MAX_SELECTED_PAGES = 24

// A page of dense spec text is ~3-4k characters. This caps a pathological
// document (one enormous page, or text extraction returning a whole book as
// page 1) rather than the normal case.
const MAX_TOTAL_CHARS = 160_000

// Below this a page's "text" is furniture — a running header, a stamped page
// number — not readable content.
//
// The test is per-page and asks whether ANY page clears it, rather than
// summing the document: a total-chars threshold calls a genuine three-page
// notice to bidders a scan, and calls a 400-page scan with a text header on
// every page a document. One page of real prose is what proves a text layer
// exists.
const MIN_CHARS_FOR_TEXT_PAGE = 100

export type SpecPageSelection = {
  /** The pages to send, in document order. Empty when nothing matched. */
  pages: PdfPageText[]
  /**
   * True when the document has so little extractable text that it must be a
   * scan. The caller sends the PDF itself in that case — selection can't work
   * on text that isn't there.
   */
  isScanned: boolean
  /**
   * True when the document has a real text layer and not one page mentions a
   * participation programme. Nothing to send: this spec sets no goal, and the
   * caller reports that without spending a Claude call on it.
   */
  hasNoGoalLanguage: boolean
}

function countTerms(haystack: string, terms: string[]): number {
  let hits = 0
  for (const term of terms) {
    // Counted once per term, not once per occurrence: a page repeating "DBE"
    // forty times in a table of contents shouldn't outrank the page that
    // actually states the goal.
    if (haystack.includes(term)) hits += 1
  }
  return hits
}

function scorePage(page: PdfPageText): number {
  const haystack = page.text.toLowerCase()
  const goalHits = countTerms(haystack, GOAL_TERMS)
  if (goalHits === 0 && !URL_PATTERN.test(page.text)) return 0

  let score = goalHits * 3

  // A percentage on a page that already talks about a programme is the
  // strongest single signal that this is the clause itself.
  if (goalHits > 0 && PERCENT_PATTERN.test(page.text)) score += 6

  // A URL only counts when the page also explains what it is for — otherwise
  // every page with the agency's address in the footer scores.
  if (URL_PATTERN.test(page.text)) {
    const linkHits = countTerms(haystack, LINK_TERMS)
    if (linkHits > 0) score += 2 + Math.min(linkHits, 3)
  }

  return score
}

/**
 * Picks the pages of a spec book that carry the participation requirement and
 * the addresses printed alongside it.
 *
 * Pages come back in document order so the page markers the extractor writes
 * read the way the document does.
 */
export function selectSpecPages(pages: PdfPageText[]): SpecPageSelection {
  const hasTextLayer = pages.some(
    (page) => page.text.trim().length >= MIN_CHARS_FOR_TEXT_PAGE,
  )
  if (!hasTextLayer) {
    return { pages: [], isScanned: true, hasNoGoalLanguage: false }
  }

  const scored = pages
    .map((page) => ({ page, score: scorePage(page) }))
    .filter((entry) => entry.score > 0)

  if (scored.length === 0) {
    return { pages: [], isScanned: false, hasNoGoalLanguage: true }
  }

  const selected = new Map<number, PdfPageText>()
  for (const page of pages.slice(0, ALWAYS_INCLUDE_FIRST_PAGES)) {
    selected.set(page.pageNumber, page)
  }

  // Highest scoring first, ties broken by page order so the choice is
  // deterministic — the same document must not produce a different request on
  // a re-run.
  const ranked = [...scored].sort(
    (a, b) => b.score - a.score || a.page.pageNumber - b.page.pageNumber,
  )

  const byNumber = new Map(pages.map((page) => [page.pageNumber, page]))
  for (const { page } of ranked) {
    if (selected.size >= MAX_SELECTED_PAGES) break
    selected.set(page.pageNumber, page)

    // A clause that starts at the bottom of a page finishes on the next one,
    // and the sentence carrying the percentage is exactly the sentence most
    // likely to straddle the break. Cheap insurance.
    const next = byNumber.get(page.pageNumber + 1)
    if (next && selected.size < MAX_SELECTED_PAGES) selected.set(next.pageNumber, next)
  }

  const ordered = [...selected.values()].sort((a, b) => a.pageNumber - b.pageNumber)

  const capped: PdfPageText[] = []
  let used = 0
  for (const page of ordered) {
    if (used >= MAX_TOTAL_CHARS) break
    const room = MAX_TOTAL_CHARS - used
    const text = page.text.length > room ? page.text.slice(0, room) : page.text
    capped.push({ pageNumber: page.pageNumber, text })
    used += text.length
  }

  return { pages: capped, isScanned: false, hasNoGoalLanguage: false }
}

/**
 * Renders selected pages for the request, marked with the page numbers they
 * came from so the model can report an honest sourcePage.
 */
export function formatSelectedPages(pages: PdfPageText[]): string {
  return pages
    .map((page) => `[PDF page ${page.pageNumber}]\n${page.text.trim()}`)
    .join("\n\n")
}
