// Throwaway spike — NOT part of the Next.js app, NOT wired into anything.
//
// Answers one question: what does the DIR public works contractor registration
// search actually give us, and on what terms? Everything here was written by
// probing the live service; the numbers in docs/REGISTRY-SOURCES.md came out of
// these commands.
//
// The short version of what it found (the doc has the long version):
//   - The old efiling.dir.ca.gov/PWCR JSP app is gone. Every path under it
//     serves "Site is currently down for maintenance". The live search is a
//     ServiceNow Service Portal at services.dir.ca.gov.
//   - There is no wildcard. A "%" in the legal name field matches ZERO rows.
//     The full list comes from an empty filter, not from a wildcard trick.
//   - services.dir.ca.gov/robots.txt is "User-agent: * / Disallow: /", so the
//     sampling mode below is capped and rate-limited on purpose.
//
// Usage (no install step — Node 22.18+ / 24+ native TypeScript):
//   node scripts/registry/spike-dir.ts probe
//   node scripts/registry/spike-dir.ts counts
//   node scripts/registry/spike-dir.ts search "smith" [pages]
//   node scripts/registry/spike-dir.ts sample <rows> <out.ndjson>
//   node scripts/registry/spike-dir.ts segment <out.ndjson>
//
// No env vars, no database, no credentials. Writes only where you tell it to.

const PORTAL = "https://services.dir.ca.gov"
const PAGE_ID = "dir_contractors"
const TABLE = "x_cdoi2_csm_portal_customer_account_lookup"

// sys_id of the "DIR Data Table" widget the portal embeds. Found by watching
// the portal's own XHR in a browser: it POSTs its options to
// /api/now/sp/widget/<sys_id> and gets the rows back. Undocumented; expect it
// to change if DIR re-publishes the widget.
const WIDGET_SYS_ID = "2f2b08c01b2546103b22c806604bcbec"

// The eight columns the public view exposes. Taken from the widget's own
// `fields` option rather than guessed — asking for anything outside this set
// gets you nothing back.
const FIELDS = [
  "pwcr",
  "legal_name",
  "doing_business_as",
  "business_structure",
  "contractor_status",
  "cslb",
  "registration_start_date",
  "registration_end_date",
].join(",")

// ServiceNow's free-text operator. The portal's search box builds
// "123TEXTQUERY321=<term>" and puts it in the URL's `filter` param, so the
// search box and a hand-written encoded query are the same channel.
const TEXT_QUERY = "123TEXTQUERY321"

// robots.txt disallows everything under this host. Sampling stays small and
// slow so the spike stays a spike.
const MAX_SAMPLE_ROWS = 5000
const DELAY_MS = 1500

const UA = "Mozilla/5.0 (Constimator source spike; one-off evaluation)"

type Cell = { value: string; display_value: string; label: string; type: string }
type Row = Record<string, Cell | string> & { sys_id: string }
type TableData = {
  list?: Row[]
  row_count?: number
  num_pages?: number
  window_size?: number
  window_start?: number
  window_end?: number
  // ServiceNow returns this keyed by field name, not as an array.
  column_labels?: Record<string, string>
  fields?: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// The portal is guest-accessible but still wants a session: a cookie jar plus
// the g_ck CSRF token that the page inlines as `window.g_ck`.
class Session {
  private cookie = ""
  private token = ""

  private absorb(res: Response) {
    const set = res.headers.getSetCookie?.() ?? []
    const jar = new Map(
      this.cookie
        .split("; ")
        .filter(Boolean)
        .map((c) => [c.split("=")[0], c]),
    )
    for (const raw of set) {
      const kv = raw.split(";")[0]
      if (kv.includes("=")) jar.set(kv.split("=")[0], kv)
    }
    this.cookie = [...jar.values()].join("; ")
  }

  async open() {
    const url = `${PORTAL}/gsp?id=${PAGE_ID}&table=${TABLE}&view=public`
    const res = await fetch(url, { headers: { "user-agent": UA } })
    this.absorb(res)
    const html = await res.text()
    const token = html.match(/window\.g_ck = '([^']+)'/)?.[1]
    if (!token) {
      throw new Error(`no g_ck in portal HTML (http ${res.status}) — the portal shell changed`)
    }
    this.token = token
    return { status: res.status, bytes: html.length, loggedIn: html.match(/window\.logged_in = (\w+)/)?.[1] }
  }

  // One page of results. `filter` is a ServiceNow encoded query, `p` is
  // 1-based, `pageSize` maps to the widget's window_size (honoured to at least
  // 2000).
  async query(filter: string, p = 1, pageSize = 20): Promise<TableData> {
    const qs = new URLSearchParams({ filter, id: PAGE_ID, p: String(p), table: TABLE, view: "public" })
    // The widget ignores a partial options object — it has to look like what
    // the Angular client posts, so this mirrors it field for field.
    const options = {
      table: TABLE,
      filter,
      p: String(p),
      o: null,
      d: null,
      fields: FIELDS,
      view: "public",
      window_size: pageSize,
      fromUrl: true,
      filterACLs: true,
      fixed_query: null,
      order: -1,
      show_keywords: true,
      show_new: true,
      show_breadcrumbs: false,
      enable_filter: "false",
      useSimpleSearch: true,
      useInstanceTitle: true,
      page_id: null,
      relationship_id: null,
      apply_to: null,
      apply_to_sys_id: null,
      table_label: "Customer Account Lookup",
      simpleSearchPlaceholder: "Contractor search",
      async_load: false,
      advanced_placeholder_dimensions: false,
      preserve_placeholder_size: false,
      active: true,
      sys_tags: "",
      sp_column_dv: "2",
      sp_widget_dv: "DIR Data Table from URL Definition",
    }
    const res = await fetch(`${PORTAL}/api/now/sp/widget/${WIDGET_SYS_ID}?${qs}`, {
      method: "POST",
      headers: {
        "user-agent": UA,
        "x-usertoken": this.token,
        cookie: this.cookie,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(options),
    })
    const text = await res.text()
    let parsed: { result?: { data?: TableData } }
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error(`non-JSON response (http ${res.status}): ${text.slice(0, 200)}`)
    }
    const data = parsed.result?.data
    if (!data) throw new Error(`no widget data in response (http ${res.status})`)
    return data
  }
}

const cell = (row: Row, field: string) => {
  const v = row[field]
  return typeof v === "object" && v !== null ? v.value : ((v as string) ?? "")
}

// --- commands ---------------------------------------------------------------

// Reports the mechanics: is the old app really gone, what does the live one
// return, what are the fields, how does it paginate.
async function probe() {
  console.log("== legacy PWCR app ==")
  for (const path of ["", "Search.action", "index.jsp"]) {
    try {
      const res = await fetch(`https://efiling.dir.ca.gov/PWCR/${path}`, { headers: { "user-agent": UA } })
      const title = (await res.text()).match(/<title>([^<]*)/i)?.[1]?.trim() ?? ""
      console.log(`  /PWCR/${path.padEnd(14)} http=${res.status} title="${title}"`)
    } catch (err) {
      console.log(`  /PWCR/${path.padEnd(14)} ERROR ${(err as Error).message}`)
    }
  }

  console.log("\n== robots.txt ==")
  const robots = await fetch(`${PORTAL}/robots.txt`, { headers: { "user-agent": UA } })
  const rules = (await robots.text()).trim().split("\n")
  console.log(rules.map((l) => "  " + l).join("\n"))

  console.log("\n== live portal ==")
  const session = new Session()
  const boot = await session.open()
  console.log(`  GET /gsp?id=${PAGE_ID} -> http=${boot.status} ${boot.bytes} bytes, logged_in=${boot.loggedIn}`)
  console.log(`  rows come from: POST /api/now/sp/widget/${WIDGET_SYS_ID}`)

  const data = await session.query(`${TEXT_QUERY}=smith`, 1, 20)
  console.log(`\n  row_count=${data.row_count} num_pages=${data.num_pages} window_size=${data.window_size}`)
  console.log(`  fields returned: ${data.fields}`)
  console.log(`  column labels: ${Object.values(data.column_labels ?? {}).join(" | ")}`)
  const first = data.list?.[0]
  if (first) {
    console.log("\n  first row:")
    for (const f of FIELDS.split(",")) {
      console.log(`    ${f.padEnd(26)} ${JSON.stringify(cell(first, f))}`)
    }
  }
}

// The battery that decides the schema. Every number in the doc's filter-language
// table comes from here.
async function counts() {
  const session = new Session()
  await session.open()
  const queries: [string, string][] = [
    ["", "empty filter — the whole public table"],
    ["legal_nameISNOTEMPTY", "every row with a legal name"],
    ["legal_nameLIKE%", "'%' as a contains-wildcard"],
    ["legal_name=%", "'%' as an equals-wildcard"],
    ["legal_nameSTARTSWITH%", "'%' as a prefix-wildcard"],
    [`${TEXT_QUERY}=%`, "'%' typed into the search box"],
    ["cslbISNOTEMPTY", "rows carrying a CSLB licence number"],
    ["cslbISEMPTY", "rows with no CSLB licence number"],
    ["contractor_status=dir_approved", "currently DIR Approved"],
    ["contractor_status=dir_approved^cslbISNOTEMPTY", "DIR Approved AND has a CSLB number"],
    ["contractor_status=dir_approved^cslbISEMPTY", "DIR Approved AND no CSLB number"],
  ]
  console.log("filter".padEnd(48), "row_count")
  for (const [filter, note] of queries) {
    const data = await session.query(filter, 1, 1)
    console.log(JSON.stringify(filter).padEnd(48), String(data.row_count ?? "?").padStart(9), ` # ${note}`)
    await sleep(DELAY_MS)
  }

  console.log("\n== page-size ceiling ==")
  for (const size of [20, 100, 500, 1000, 2000]) {
    const data = await session.query("legal_nameISNOTEMPTY", 1, size)
    console.log(
      `  asked ${String(size).padStart(4)} -> window_size=${data.window_size} rows=${data.list?.length} pages=${data.num_pages}`,
    )
    await sleep(DELAY_MS)
  }
}

// What the search box does end to end, so the pagination story can be checked
// by eye against the real site.
async function search(term: string, pages: number) {
  const session = new Session()
  await session.open()
  const filter = `${TEXT_QUERY}=${term}`
  for (let p = 1; p <= pages; p++) {
    const data = await session.query(filter, p, 20)
    console.log(
      `\n-- page ${p}/${data.num_pages} (rows ${(data.window_start ?? 0) + 1}-${data.window_end} of ${data.row_count}) --`,
    )
    for (const row of data.list ?? []) {
      console.log(
        [
          cell(row, "pwcr").padEnd(11),
          cell(row, "cslb").padEnd(8),
          cell(row, "contractor_status").padEnd(20),
          cell(row, "legal_name"),
        ].join(" "),
      )
    }
    if (p >= (data.num_pages ?? 1)) break
    await sleep(DELAY_MS)
  }
}

// Pulls a bounded sample to NDJSON so spike-cslb.ts can measure the join.
// Capped and rate-limited on purpose — see the robots.txt note at the top.
async function sample(rows: number, out: string) {
  if (rows > MAX_SAMPLE_ROWS) {
    throw new Error(
      `refusing ${rows} rows — this is a spike, cap is ${MAX_SAMPLE_ROWS} (robots.txt disallows crawling this host)`,
    )
  }
  const { appendFileSync, writeFileSync } = await import("node:fs")
  const session = new Session()
  await session.open()

  // Only rows carrying a CSLB number can be joined at all, so sample those.
  // What share of DIR rows have one is a separate number, from `counts`.
  const filter = "cslbISNOTEMPTY"
  const pageSize = 500
  writeFileSync(out, "")

  // Results come back sorted by legal name, so the first N pages would be a
  // sample of companies whose names start with digits and punctuation. Stride
  // evenly across the whole result set instead.
  const first = await session.query(filter, 1, pageSize)
  const totalPages = first.num_pages ?? 1
  const wanted = Math.ceil(rows / pageSize)
  const stride = Math.max(1, Math.floor(totalPages / wanted))
  const pages = Array.from({ length: wanted }, (_, i) => 1 + i * stride).filter((p) => p <= totalPages)
  console.log(`  ${first.row_count} rows match; sampling ${pages.length} pages of ${pageSize} every ${stride} pages`)

  let written = 0
  for (const p of pages) {
    const data = p === 1 ? first : await session.query(filter, p, pageSize)
    const list = data.list ?? []
    if (!list.length) break
    const lines = list
      .slice(0, rows - written)
      .map((row) => JSON.stringify(Object.fromEntries(FIELDS.split(",").map((f) => [f, cell(row, f)]))))
    appendFileSync(out, lines.join("\n") + "\n")
    written += lines.length
    console.log(`  page ${p}/${totalPages}: +${lines.length} (${written}/${rows})`)
    if (written >= rows) break
    await sleep(DELAY_MS)
  }
  console.log(`\nwrote ${written} rows to ${out}`)
}

// Pulls the whole currently-approved set — the universe of entities allowed to
// bid public work, and the only part of DIR that matters for segmenting the
// CSLB list. It is ~35.5k rows, so at 2,000 per page it is under 20 requests:
// a targeted subset, not a sweep of the 137k-row table. Still against a host
// that disallows crawling, so it stays rate-limited and one-off.
async function segment(out: string) {
  const { appendFileSync, writeFileSync } = await import("node:fs")
  const session = new Session()
  await session.open()

  const filter = "contractor_status=dir_approved"
  const pageSize = 2000
  writeFileSync(out, "")

  const first = await session.query(filter, 1, pageSize)
  const totalPages = first.num_pages ?? 1
  console.log(`  ${first.row_count} approved registrations across ${totalPages} pages of ${pageSize}`)

  let written = 0
  for (let p = 1; p <= totalPages; p++) {
    const data = p === 1 ? first : await session.query(filter, p, pageSize)
    const list = data.list ?? []
    if (!list.length) break
    const lines = list.map((row) =>
      JSON.stringify(Object.fromEntries(FIELDS.split(",").map((f) => [f, cell(row, f)]))),
    )
    appendFileSync(out, lines.join("\n") + "\n")
    written += lines.length
    console.log(`  page ${p}/${totalPages}: +${lines.length} (${written})`)
    if (p < totalPages) await sleep(DELAY_MS)
  }
  console.log(`\nwrote ${written} rows to ${out}`)
}

// --- entry ------------------------------------------------------------------

const [command, ...rest] = process.argv.slice(2)
try {
  switch (command) {
    case "probe":
      await probe()
      break
    case "counts":
      await counts()
      break
    case "search":
      await search(rest[0] ?? "smith", Number(rest[1] ?? 1))
      break
    case "segment":
      await segment(rest[0] ?? "dir-approved.ndjson")
      break
    case "sample":
      await sample(Number(rest[0] ?? 500), rest[1] ?? "dir-sample.ndjson")
      break
    default:
      console.error("usage: spike-dir.ts <probe|counts|search <term> [pages]|sample <rows> <out.ndjson>|segment <out.ndjson>>")
      process.exit(1)
  }
} catch (err) {
  console.error(`\nFAILED: ${(err as Error).message}`)
  process.exit(1)
}

export {}
