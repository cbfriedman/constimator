// Links a quantity read off a plan sheet (or measured by the takeoff) to the
// official bid item it's for. Text-only and deterministic: no AI call, so
// it runs on every matrix read and its verdicts are reproducible.
//
// Plan sheets and bid forms describe the same work in different words —
// "18\" RCP CL III" on a drainage schedule is "Reinforced Concrete Pipe, 18
// inch, Class III" on the schedule of items — so exact-description matching
// (what lib/reconciliation-diff.ts does for estimate lines, which a human
// typed against the bid form) is useless here. This normalizes the civil
// vocabulary both sides draw from and matches on the tokens that survive.
//
// The bias throughout is toward *not* matching. An unlinked callout is a
// row the contractor links by hand in a click; a wrongly linked one is a
// discrepancy against the wrong item, which is worse than nothing.

export type MatchableBid = {
  id: string
  itemNumber: string
  description: string
  unit: string
}

export type MatchCandidate = {
  description: string
  unit: string
  /** The extractor's own guess at the bid item number, if it made one. */
  bidItemNumber?: string | null
}

export type BidMatch<B extends MatchableBid> = {
  bid: B
  source: "ai" | "description"
}

const UNIT_ALIASES: Record<string, string> = {
  ls: "ls",
  lumpsum: "ls",
  lump: "ls",
  lf: "lf",
  linft: "lf",
  lnft: "lf",
  linearfoot: "lf",
  linearfeet: "lf",
  lft: "lf",
  cy: "cy",
  cuyd: "cy",
  cubicyard: "cy",
  cubicyards: "cy",
  sy: "sy",
  sqyd: "sy",
  squareyard: "sy",
  squareyards: "sy",
  sf: "sf",
  sqft: "sf",
  squarefoot: "sf",
  squarefeet: "sf",
  ea: "ea",
  each: "ea",
  ton: "ton",
  tons: "ton",
  tn: "ton",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  gal: "gal",
  gallon: "gal",
  gallons: "gal",
  hr: "hr",
  hour: "hr",
  hours: "hr",
  day: "day",
  days: "day",
  mi: "mi",
  mile: "mi",
  miles: "mi",
  ac: "ac",
  acre: "ac",
  acres: "ac",
  mo: "mo",
  month: "mo",
  months: "mo",
  cf: "cf",
  cuft: "cf",
  mbm: "mfbm",
  mfbm: "mfbm",
}

/**
 * "L.S." / "Lump Sum" / "LS" → "ls"; "Lin. Ft." / "LF" → "lf"; and so on.
 * Unknown units collapse to their letters, so two sheets that both print
 * "STA" still compare equal.
 */
export function normalizeUnit(unit: string): string {
  const compact = unit.toLowerCase().replace(/[^a-z]/g, "")
  return UNIT_ALIASES[compact] ?? compact
}

// Abbreviations that appear on plan sheets and bid schedules for the same
// thing. Expanded on both sides before tokenizing so either spelling
// matches the other. Multi-word expansions become several tokens.
const ABBREVIATIONS: Record<string, string> = {
  rcp: "reinforced concrete pipe",
  cmp: "corrugated metal pipe",
  hdpe: "high density polyethylene pipe",
  pvc: "pvc pipe",
  dip: "ductile iron pipe",
  hma: "hot mix asphalt",
  ac: "asphalt concrete",
  pcc: "portland cement concrete",
  conc: "concrete",
  reinf: "reinforced",
  cl: "class",
  dia: "diameter",
  diam: "diameter",
  exc: "excavation",
  excav: "excavation",
  agg: "aggregate",
  ab: "aggregate base",
  cab: "class 2 aggregate base",
  dwy: "driveway",
  sw: "sidewalk",
  cg: "curb gutter",
  cndg: "curb gutter",
  sd: "storm drain",
  ss: "sanitary sewer",
  mh: "manhole",
  di: "drainage inlet",
  cb: "catch basin",
  tc: "traffic control",
  swppp: "storm water pollution prevention plan",
  rmv: "remove",
  rem: "remove",
  removal: "remove",
  removals: "remove",
  relocate: "relocate",
  reloc: "relocate",
  adj: "adjust",
  struct: "structure",
  thk: "thick",
  typ: "type",
  w: "with",
  esa: "environmentally sensitive area",
}

const ROMAN: Record<string, string> = { i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6" }

// Words that carry no identity — present on nearly every line, so they'd
// inflate overlap between unrelated items.
const STOPWORDS = new Set([
  "and",
  "or",
  "of",
  "the",
  "a",
  "an",
  "for",
  "with",
  "per",
  "to",
  "at",
  "in",
  "on",
  "install",
  "furnish",
  "construct",
  "place",
  "new",
  "existing",
  "complete",
  "including",
  "all",
  "misc",
  "miscellaneous",
  "item",
  "items",
  "pipe",
])

/**
 * The comparable tokens of a description. Sizes are normalized so 18", 18
 * in, 18-inch and 18 inch all become "18in"; roman class numbers become
 * arabic; abbreviations are expanded; stopwords and punctuation are
 * dropped. Exported for the tests.
 */
export function descriptionTokens(description: string): Set<string> {
  let text = description.toLowerCase()
  // Inch and foot marks, in every way a drafter writes them. Done before
  // punctuation is stripped so the mark itself is what triggers it.
  text = text.replace(/(\d+(?:\.\d+)?)\s*(?:"|''|”|-?\s?inch(?:es)?\b|-?\s?in\b)/g, "$1in ")
  text = text.replace(/(\d+(?:\.\d+)?)\s*(?:'|’|-?\s?f(?:ee|oo)?t\b)/g, "$1ft ")
  text = text.replace(/[^a-z0-9.]+/g, " ")
  // "6.0in" and "6in" are the same size; "2.5in" keeps its decimal.
  text = text.replace(/(\d+)\.0+(in|ft)\b/g, "$1$2")

  const tokens = new Set<string>()
  for (const raw of text.split(/\s+/)) {
    const word = raw.replace(/^\.+|\.+$/g, "")
    if (!word) continue
    const expanded = ABBREVIATIONS[word] ?? ROMAN[word] ?? word
    for (const token of expanded.split(" ")) {
      if (token && !STOPWORDS.has(token)) tokens.add(token)
    }
  }
  return tokens
}

function sizeTokens(tokens: Set<string>): Set<string> {
  return new Set([...tokens].filter((t) => /^\d+(?:\.\d+)?(?:in|ft)$/.test(t)))
}

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0
  for (const token of a) if (b.has(token)) n += 1
  return n
}

function normalizeItemNumber(itemNumber: string): string {
  return itemNumber.trim().toLowerCase().replace(/^0+(?=\d)/, "")
}

// Below this, a description match isn't trusted. 0.6 means "most of the
// shorter description's tokens appear in the other" — enough that "Type
// G1 Inlet" finds "Drainage Inlet, Type G1", not enough that "Concrete
// Sidewalk" finds "Concrete Curb and Gutter".
const MIN_SCORE = 0.6

/**
 * The bid item a callout or takeoff item is for, or null when there isn't
 * a confident answer.
 *
 * The extractor's own item-number hint wins when it names a real bid item
 * of the same unit — it was made with the sheet in view, which beats
 * anything text matching can do. Failing that, tokens: the candidate has to
 * share the callout's unit, agree on every size it mentions (an 18" pipe is
 * never a 24" pipe however similar the words), clear MIN_SCORE, and win
 * outright — a tie between two bid items is "don't know", not "pick one".
 */
export function matchBidItem<B extends MatchableBid>(
  candidate: MatchCandidate,
  bids: B[],
): BidMatch<B> | null {
  const unit = normalizeUnit(candidate.unit)

  if (candidate.bidItemNumber) {
    const hinted = normalizeItemNumber(candidate.bidItemNumber)
    const byNumber = bids.filter((bid) => normalizeItemNumber(bid.itemNumber) === hinted)
    const hintedBid = byNumber.find((bid) => normalizeUnit(bid.unit) === unit)
    if (hintedBid) return { bid: hintedBid, source: "ai" }
  }

  const tokens = descriptionTokens(candidate.description)
  if (tokens.size === 0) return null
  const sizes = sizeTokens(tokens)

  let best: { bid: B; score: number } | null = null
  let tied = false
  for (const bid of bids) {
    if (normalizeUnit(bid.unit) !== unit) continue
    const bidTokens = descriptionTokens(bid.description)
    if (bidTokens.size === 0) continue
    const bidSizes = sizeTokens(bidTokens)
    if (sizes.size > 0 && bidSizes.size > 0 && overlap(sizes, bidSizes) === 0) continue

    const shared = overlap(tokens, bidTokens)
    if (shared === 0) continue
    const score = shared / Math.min(tokens.size, bidTokens.size)
    if (score < MIN_SCORE) continue

    if (!best || score > best.score) {
      best = { bid, score }
      tied = false
    } else if (score === best.score) {
      tied = true
    }
  }

  if (!best || tied) return null
  return { bid: best.bid, source: "description" }
}
