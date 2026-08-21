// Locating an extracted condition's source text inside a PDF's own text layer.
//
// The premise: a bounding box asked of a vision model is a guess, and a
// highlight is a claim that can't be hedged — it either lands on the right
// words or it points an estimator at the wrong ones and invites them to
// confirm it. So nothing here estimates geometry. It takes the verbatim
// rawText the extractor already promises (worker/src/extract-quote-conditions.ts:
// "copied verbatim … never paraphrase, correct, complete, or clean up") and
// finds those words in the text the PDF itself carries. That turns a guess
// into a lookup: the position is the document's, not a model's.
//
// The one rule that makes it trustworthy: no confident match, no highlight.
// Returning null is a correct answer. A wrong box is not.
//
// Everything here is pure string work over the text items pdf.js hands back,
// so it is exhaustively testable without a PDF, a browser, or an API key —
// which matters, because extraction has never yet run against a real quote.

/** Just the part of a pdf.js TextItem this module needs. Geometry stays in the component, which has the viewport. */
export type PdfTextItem = {
  str: string
}

export type TextMatch = {
  /** Indices into the items array that the match overlaps, in order. */
  itemIndices: number[]
  /**
   * exact  — the words were found, allowing only for whitespace and
   *          punctuation differences. Safe to highlight.
   * fuzzy  — most of the words were found in order, but not all. Highlight,
   *          but tell the reader it is approximate.
   */
  quality: "exact" | "fuzzy"
  /** 0-1. Used to decide whether to highlight at all, and what to say about it. */
  score: number
}

/**
 * Fuzzy matches below this are discarded rather than shown. Chosen so that a
 * genuine sentence with a couple of transcription differences still lands,
 * while a coincidental overlap of common words ("the", "of", "work") does not.
 */
export const MIN_FUZZY_SCORE = 0.7

/** Below this many tokens, a fuzzy match is too easy to hit by chance to trust. Short conditions must match exactly or not at all. */
const MIN_FUZZY_TOKENS = 4

/**
 * Folds away everything that legitimately differs between the model's
 * transcription and the PDF's text layer without changing the words:
 * compatibility forms and ligatures (ﬁ -> fi), smart quotes and dashes, soft
 * hyphens, non-breaking spaces, and runs of whitespace.
 *
 * Case is folded too. A condition is the same condition in either case, and
 * PDFs routinely carry small-caps or all-caps headings as literal case.
 */
export function normalizeText(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/[­​-‍﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

/** Letters and digits only. Absorbs both punctuation drift and words split across text items ("Traf" + "fic"). */
function alphanumericOnly(input: string): string {
  return normalizeText(input).replace(/[^a-z0-9]/g, "")
}

/**
 * Builds one searchable string from the page's text items, plus a parallel
 * array saying which item each character came from — that array is what makes
 * a match position mappable back to something drawable.
 *
 * `separator` is inserted between items only when neither side already ends or
 * begins with whitespace: pdf.js frequently emits adjacent words as separate
 * items with no space of their own, and joining those blind would weld them
 * into one word.
 */
function buildIndex(
  items: PdfTextItem[],
  transform: (value: string) => string,
  separator: string,
): { text: string; owner: number[] } {
  let text = ""
  const owner: number[] = []

  items.forEach((item, index) => {
    const piece = transform(item.str)
    if (piece.length === 0) return

    if (
      separator.length > 0 &&
      text.length > 0 &&
      !/\s$/.test(text) &&
      !/^\s/.test(piece)
    ) {
      text += separator
      owner.push(index)
    }

    text += piece
    for (let i = 0; i < piece.length; i += 1) owner.push(index)
  })

  return { text, owner }
}

function itemsCovering(owner: number[], start: number, end: number): number[] {
  const seen = new Set<number>()
  for (let i = start; i < end && i < owner.length; i += 1) seen.add(owner[i])
  return [...seen].sort((a, b) => a - b)
}

/**
 * Locates `needle` only when the page contains it exactly once.
 *
 * A second occurrence means the words really are on the page but we cannot
 * tell *which* of them this condition was read from — a repeated row in a
 * schedule, a term restated in a footer. Highlighting the first hit would be a
 * coin flip presented as a fact, so ambiguity is treated as a failure to
 * locate rather than as a match.
 */
function uniqueIndexOf(haystack: string, needle: string): number | null {
  const first = haystack.indexOf(needle)
  if (first === -1) return null
  if (haystack.indexOf(needle, first + 1) !== -1) return null
  return first
}

/**
 * Finds `query` among `items`, or returns null.
 *
 * Three passes, each stricter to weaker:
 *   1. Whitespace-normalised substring — the ordinary case.
 *   2. Alphanumeric-only substring — same words, different punctuation, or a
 *      word the PDF split across two text items.
 *   3. Token-coverage fallback — most of the words present in order. Only
 *      above MIN_FUZZY_SCORE, and only for queries long enough that agreement
 *      means something.
 */
export function findTextInItems(items: PdfTextItem[], query: string): TextMatch | null {
  const normalizedQuery = normalizeText(query)
  if (normalizedQuery.length === 0 || items.length === 0) return null

  // Pass 1 — whitespace-normalised.
  const spaced = buildIndex(items, normalizeText, " ")
  const spacedAt = uniqueIndexOf(spaced.text, normalizedQuery)
  if (spacedAt !== null) {
    return {
      itemIndices: itemsCovering(spaced.owner, spacedAt, spacedAt + normalizedQuery.length),
      quality: "exact",
      score: 1,
    }
  }

  // Pass 2 — punctuation and item-split insensitive.
  const squashedQuery = alphanumericOnly(query)
  if (squashedQuery.length > 0) {
    const squashed = buildIndex(items, alphanumericOnly, "")
    const squashedAt = uniqueIndexOf(squashed.text, squashedQuery)
    if (squashedAt !== null) {
      return {
        itemIndices: itemsCovering(squashed.owner, squashedAt, squashedAt + squashedQuery.length),
        quality: "exact",
        // Marginally below 1 to record that punctuation had to be ignored.
        score: 0.95,
      }
    }
  }

  // A phrase that occurs several times reaches here. Fuzzy matching would
  // happily anchor on the first of them, reintroducing exactly the coin flip
  // uniqueIndexOf just refused, so stop rather than fall through.
  if (spaced.text.includes(normalizedQuery)) return null

  // Pass 3 — token coverage.
  return fuzzyMatch(items, normalizedQuery, spaced)
}

function fuzzyMatch(
  items: PdfTextItem[],
  normalizedQuery: string,
  spaced: { text: string; owner: number[] },
): TextMatch | null {
  const queryTokens = normalizedQuery.split(" ").filter((token) => token.length > 0)
  if (queryTokens.length < MIN_FUZZY_TOKENS) return null

  // Walk the page text once, consuming query tokens in order. Anchoring on
  // order (rather than counting tokens anywhere on the page) is what stops a
  // page that merely reuses the same common words from scoring highly.
  const pageTokens: { token: string; start: number; end: number }[] = []
  const tokenPattern = /[^\s]+/g
  let hit: RegExpExecArray | null
  while ((hit = tokenPattern.exec(spaced.text)) !== null) {
    pageTokens.push({ token: hit[0], start: hit.index, end: hit.index + hit[0].length })
  }

  let best: { matched: number; start: number; end: number } | null = null

  for (let origin = 0; origin < pageTokens.length; origin += 1) {
    if (pageTokens[origin].token !== queryTokens[0]) continue

    let matched = 0
    let cursor = origin
    let end = pageTokens[origin].end

    for (const queryToken of queryTokens) {
      // Allow a small drift so an extra word in the PDF (a stray header, a
      // line number) doesn't abort the whole run.
      const limit = Math.min(cursor + 4, pageTokens.length)
      let found = -1
      for (let i = cursor; i < limit; i += 1) {
        if (pageTokens[i].token === queryToken) {
          found = i
          break
        }
      }
      if (found === -1) continue
      matched += 1
      cursor = found + 1
      end = pageTokens[found].end
    }

    if (!best || matched > best.matched) {
      best = { matched, start: pageTokens[origin].start, end }
    }
  }

  if (!best) return null

  const score = best.matched / queryTokens.length
  if (score < MIN_FUZZY_SCORE) return null

  return {
    itemIndices: itemsCovering(spaced.owner, best.start, best.end),
    quality: "fuzzy",
    score,
  }
}
