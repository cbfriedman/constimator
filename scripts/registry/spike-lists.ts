// Throwaway spike — NOT part of the Next.js app, NOT wired into anything.
//
// Turns the two source files into the outreach tiers we actually care about:
//
//   Tier 1  A and/or B licence + DIR public works registration  — primes
//   Tier 3  C-classification only + DIR registration            — specialty
//           contractors, who prime when the job sits entirely inside their
//           classification and sub the rest of the time
//
// (Tier 2, DBE subcontractors, is not here — the DBE directory publishes no
// licence number, so it needs name/phone matching first. See the DBE section
// of docs/REGISTRY-SOURCES.md.)
//
// It also reports which outreach channels are actually available, which is the
// question that decides whether automated outreach is even possible. Short
// version: CSLB withholds email addresses by statute, so there are none.
//
// Usage (no install step — Node 22.18+ / 24+ native TypeScript):
//   node scripts/registry/spike-lists.ts <master.csv> <dir-approved.ndjson> <out-dir>
//
// Inputs come from the other two spikes:
//   spike-cslb.ts master MasterLicenseData.csv
//   spike-dir.ts  segment dir-approved.ndjson

const PRIME_CLASSES = new Set(["A", "B", "B-2"])

type Licence = {
  licenseNo: string
  name: string
  dba: string
  address: string
  city: string
  state: string
  zip: string
  county: string
  phone: string
  classes: string
  status: string
  businessType: string
  expires: string
}

// The master file quotes fields containing commas, so a plain split() silently
// corrupts the tail of those rows.
function splitCsv(line: string): string[] {
  const out: string[] = []
  let field = ""
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ",") {
      out.push(field)
      field = ""
    } else field += ch
  }
  out.push(field)
  return out
}

const toCsv = (row: string[]) =>
  row.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(",")

// CSLB writes single-digit C classes with a hyphen (C-8) and two-digit ones
// without (C10); C-61 subcategories are zero-padded (D03). Normalise before
// deciding what someone is licensed to do.
const canonical = (token: string) => {
  const t = token.trim().toUpperCase()
  const m = t.match(/^([A-Z])-?0*(\d+)$/)
  return m ? `${m[1]}-${Number(m[2])}` : t
}

const [masterPath, dirPath, outDir] = process.argv.slice(2)
if (!masterPath || !dirPath || !outDir) {
  console.error("usage: spike-lists.ts <master.csv> <dir-approved.ndjson> <out-dir>")
  process.exit(1)
}

const { createReadStream, writeFileSync, existsSync, mkdirSync } = await import("node:fs")
const { createInterface } = await import("node:readline")

// --- index the CSLB master --------------------------------------------------

console.log(`indexing ${masterPath}…`)
const licences = new Map<string, Licence>()
let header: string[] = []
for await (const line of createInterface({
  input: createReadStream(masterPath, { encoding: "utf8" }),
  crlfDelay: Infinity,
})) {
  if (!line.trim()) continue
  const cols = splitCsv(line)
  if (!header.length) {
    header = cols
    // Worth stating plainly rather than discovering later: there is no email
    // column, and that is deliberate on CSLB's part, not an omission.
    const emailish = header.filter((h) => /e-?mail/i.test(h))
    console.log(`  ${header.length} columns; email columns present: ${emailish.length ? emailish.join(", ") : "NONE"}`)
    continue
  }
  const g = (name: string) => cols[header.indexOf(name)] ?? ""
  const key = g("LicenseNo").replace(/\D/g, "").replace(/^0+/, "")
  if (!key) continue
  licences.set(key, {
    licenseNo: g("LicenseNo").trim(),
    name: g("FullBusinessName") || g("BusinessName"),
    dba: g("BUS-NAME-2"),
    address: g("MailingAddress"),
    city: g("City"),
    state: g("State"),
    zip: g("ZIPCode"),
    county: g("County"),
    phone: g("BusinessPhone"),
    classes: g("Classifications(s)"),
    status: g("PrimaryStatus"),
    businessType: g("BusinessType"),
    expires: g("ExpirationDate"),
  })
}
console.log(`  ${licences.size.toLocaleString()} licences indexed`)

// --- walk the DIR approved set ----------------------------------------------

console.log(`\nreading ${dirPath}…`)
const tier1: Licence[] = []
const tier3: Licence[] = []
const seen = new Set<string>()
let dirRows = 0
let noNumber = 0
let unresolved = 0
let notClear = 0

for await (const line of createInterface({
  input: createReadStream(dirPath, { encoding: "utf8" }),
  crlfDelay: Infinity,
})) {
  if (!line.trim()) continue
  dirRows++
  const row = JSON.parse(line) as Record<string, string>
  const key = (row.cslb ?? "").replace(/\D/g, "").replace(/^0+/, "")
  if (!key) {
    noNumber++
    continue
  }
  const hit = licences.get(key)
  if (!hit) {
    unresolved++
    continue
  }
  if (!/CLEAR/i.test(hit.status)) {
    notClear++
    continue
  }
  // A licence can hold several DIR registrations over the years; one row each.
  if (seen.has(key)) continue
  seen.add(key)

  const classes = hit.classes.split(/[|,\s]+/).filter(Boolean).map(canonical)
  if (classes.some((c) => PRIME_CLASSES.has(c))) tier1.push(hit)
  else if (classes.some((c) => c.startsWith("C-") || c === "C")) tier3.push(hit)
}

// --- write ------------------------------------------------------------------

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

const HEADERS = [
  "license_no",
  "business_name",
  "dba",
  "address",
  "city",
  "state",
  "zip",
  "county",
  "phone",
  "classifications",
  "business_type",
  "license_expires",
]
const rowOf = (l: Licence) => [
  l.licenseNo,
  l.name,
  l.dba,
  l.address,
  l.city,
  l.state,
  l.zip,
  l.county,
  l.phone,
  l.classes,
  l.businessType,
  l.expires,
]

const write = (name: string, rows: Licence[]) => {
  const path = `${outDir}/${name}`
  writeFileSync(path, [toCsv(HEADERS), ...rows.map((r) => toCsv(rowOf(r)))].join("\n") + "\n")
  console.log(`  ${path}  —  ${rows.length.toLocaleString()} rows`)
}

console.log(`\nDIR approved rows read        ${dirRows.toLocaleString()}`)
console.log(`  no CSLB number              ${noNumber.toLocaleString()}`)
console.log(`  number did not resolve      ${unresolved.toLocaleString()}`)
console.log(`  licence not clear/active    ${notClear.toLocaleString()}`)
console.log(`  distinct usable licences    ${seen.size.toLocaleString()}`)

console.log(`\nwriting lists:`)
write("tier1-prime-ab.csv", tier1)
write("tier3-specialty-c.csv", tier3)
write("tiers1and3-all.csv", [...tier1, ...tier3])

// --- what can we actually reach them on? ------------------------------------

const pct = (n: number, d: number) => (d ? ((n / d) * 100).toFixed(1) + "%" : "n/a")
const channel = (label: string, rows: Licence[]) => {
  const phone = rows.filter((r) => r.phone.replace(/\D/g, "").length >= 10).length
  const mail = rows.filter((r) => r.address.trim() && r.city.trim() && r.zip.trim()).length
  console.log(`\n${label} (${rows.length.toLocaleString()})`)
  console.log(`  phone      ${String(phone).padStart(6)}  ${pct(phone, rows.length)}`)
  console.log(`  mailing    ${String(mail).padStart(6)}  ${pct(mail, rows.length)}`)
  console.log(`  email           0  0.0%   — CSLB withholds email (B&P Code s.27)`)
}
console.log(`\n=== reachable channels ===`)
channel("Tier 1 — A/B primes", tier1)
channel("Tier 3 — C specialty", tier3)

export {}
