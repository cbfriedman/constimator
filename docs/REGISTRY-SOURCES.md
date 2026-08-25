# Registry sources: what DIR and CSLB actually give us

Findings from the source spike. Everything below was measured against the live
services on **2026-08-24** with [scripts/registry/spike-dir.ts](../scripts/registry/spike-dir.ts)
and [scripts/registry/spike-cslb.ts](../scripts/registry/spike-cslb.ts) — those
are throwaway probes, not app code, and nothing in the app reads either source
yet. Re-run the commands quoted under each section to reproduce a number.

The point of the spike was to stop guessing before designing a schema. Three of
the five things we planned to do turned out to rest on premises that don't hold.

## Summary

| Planned assumption | What's actually true |
|---|---|
| CSLB bulk file has to be priced and bought; the reply is calendar time we can't compress | **There is nothing to buy.** CSLB publishes the statewide master file as a free direct download, refreshed daily. No email, no lead time. |
| DIR search returns the full list when you put `%` in the legal name field | **`%` matches zero rows.** DIR moved to a ServiceNow portal with an encoded-query language; the full list comes from an *empty* filter. |
| DIR is primary, CSLB supplies trades | **Invert it.** Only 23.7% of DIR rows carry a CSLB licence number at all, and DIR's robots.txt disallows crawling. CSLB is the bulk source; DIR is a per-contractor public-works flag. |
| Match rate decides the design | **Two different rates, and they disagree.** Join-key quality is 92.2% (comfortably above the 85% band); DIR-side coverage is 23.7% overall / 63.2% for active registrations. Coverage is the binding constraint, not key quality. |

## DIR — public works contractor registration

### The old app is gone

`efiling.dir.ca.gov/PWCR/` — the JSP search everything was planned around —
now serves a maintenance placeholder on **every** path, not just the root:

```
/PWCR/               http=200 title="Server Down For Maintenance"
/PWCR/Search.action  http=200 title="Server Down For Maintenance"
/PWCR/index.jsp      http=200 title="Server Down For Maintenance"
```

The live search is linked from [dir.ca.gov/Public-Works/Contractors.html](https://www.dir.ca.gov/Public-Works/Contractors.html)
as "Public Works Contractor Registration Search" and points at a **ServiceNow
Service Portal**:

```
https://services.dir.ca.gov/gsp?id=dir_contractors
  &table=x_cdoi2_csm_portal_customer_account_lookup
  &view=public&sysparm_fixed_query=type%3D2
```

### How to query it

The page is an Angular shell; rows arrive over a private widget API. Guest
access works (`window.logged_in = false`) but needs a session: cookies plus the
`g_ck` CSRF token the page inlines. Then:

```
POST https://services.dir.ca.gov/api/now/sp/widget/2f2b08c01b2546103b22c806604bcbec
```

with the widget's full options object as the body. A partial options object
silently returns an empty widget — that's the main trap.

The `filter` parameter is a **ServiceNow encoded query**, and it is the same
channel the on-screen search box uses: typing in the box just builds
`123TEXTQUERY321=<term>` and puts it in the URL. So anything the encoded query
language can express is available to us — `cslbISNOTEMPTY`,
`contractor_status=dir_approved^cslbISNOTEMPTY`, and so on.

The widget sys_id is undocumented and will change if DIR re-publishes the
widget. Treat it as a fixture to re-derive, not a constant to rely on.

### Fields returned

Eight, taken from the widget's own `fields` option rather than guessed. Asking
for anything outside this set returns nothing:

| Field | Label | Notes |
|---|---|---|
| `pwcr` | PWCR | Registration number. Blank on some rows. |
| `legal_name` | Legal Entity Name | |
| `doing_business_as` | Doing Business As (DBA) | Often blank |
| `business_structure` | Business Structure | choice: `llc`, `corporation`, `sole_proprietorships`, … |
| `contractor_status` | Contractor Status | choice: `dir_approved`, `registration_expired`, … |
| `cslb` | CSLB | **The join key.** Free-text, frequently blank or malformed. |
| `registration_start_date` | Registration Start Date | `glide_date`, ISO |
| `registration_end_date` | Registration End Date | `glide_date`, ISO |

No address, no county, no phone, no trade/classification. **DIR cannot tell us
what a contractor does** — that has to come from CSLB, which is why the licence
number matters so much.

### Pagination

`p` is 1-based; page size is the widget's `window_size` and the server honours
what you ask for, at least to 2,000 (`spike-dir.ts counts`):

```
asked   20 -> window_size=20   rows=20   pages=6863
asked  100 -> window_size=100  rows=100  pages=1373
asked  500 -> window_size=500  rows=500  pages=275
asked 1000 -> window_size=1000 rows=1000 pages=138
asked 2000 -> window_size=2000 rows=2000 pages=69
```

Deep pages work (p=5000 returns real rows; past the end returns an empty list).
Each response also carries `row_count`, `num_pages`, `window_start`,
`window_end` — so a count is one cheap request with `window_size=1`.

### The `%` wildcard does not exist

This was the premise the schema was going to be designed around, and it is
false. From `spike-dir.ts counts`:

```
""                                                  137649  # empty filter — the whole public table
"legal_nameISNOTEMPTY"                              137259  # every row with a legal name
"legal_nameLIKE%"                                        0  # '%' as a contains-wildcard
"legal_name=%"                                           0  # '%' as an equals-wildcard
"legal_nameSTARTSWITH%"                                  0  # '%' as a prefix-wildcard
"123TEXTQUERY321=%"                                      0  # '%' typed into the search box
```

`%` is a literal character here, not a wildcard — ServiceNow uses named
operators (`LIKE`, `STARTSWITH`, `ISNOTEMPTY`). The way to get the full list is
to pass **no filter at all**: 137,649 rows, 69 requests at 2,000 per page.

### CSLB licence coverage inside DIR

Also from `counts` — these are the numbers that move the design:

```
"cslbISNOTEMPTY"                                     32569  # rows carrying a CSLB licence number
"cslbISEMPTY"                                       105080  # rows with no CSLB licence number
"contractor_status=dir_approved"                     35532  # currently DIR Approved
"contractor_status=dir_approved^cslbISNOTEMPTY"      22446  # DIR Approved AND has a CSLB number
"contractor_status=dir_approved^cslbISEMPTY"         13086  # DIR Approved AND no CSLB number
```

- **23.7%** of all DIR rows carry a CSLB number (32,569 / 137,649).
- **63.2%** of currently-approved registrations carry one (22,446 / 35,532).

The gap is not a data-quality accident: DIR registration covers public agencies,
JPAs, and non-contractor entities that have no CSLB licence, plus a long tail of
expired registrations. The table has 137,649 rows but only 35,532 currently
approved.

### robots.txt forbids crawling

```
$ curl https://services.dir.ca.gov/robots.txt
User-agent: *
Disallow: /
```

Blanket disallow on the whole host. That rules out a nightly full-table harvest
of DIR as a design option, regardless of what's technically possible. The
spike's `sample` command is capped at 5,000 rows with a 1.5s delay for that
reason, and it strides across the result set rather than taking the first N
pages (results are name-sorted, so the head of the list is all digits and
punctuation).

`www.dir.ca.gov/robots.txt` is much narrower and does not disallow the public
works pages — it's specifically the ServiceNow host that's closed.

## CSLB — contractor licences

### There is nothing to buy

The first work item was to send a bulk-file pricing request on day one because
the reply is calendar time we can't compress. That item is moot. CSLB's
[Public Data Portal](https://cslb.ca.gov/Onlineservices/DataPortal/) publishes
three statewide files, and all three pages say, verbatim:

> **Fee**
> There is no charge for this service.

The portal offers:

| Product | Contents | Format | Fee |
|---|---|---|---|
| Master list | License master, workers' compensation, personnel — three files | Excel (.xls) or CSV | none |
| By classification | Up to 10 classifications | Excel (.xls) | none |
| By classification + county | Up to 10 classifications × up to 10 counties | Excel (.xls) | none |

### Direct download URLs

The portal's download buttons are ASP.NET `__doPostBack` calls, but the postback
just redirects to a plain handler that needs no cookie or token:

```
https://cslb.ca.gov/OnlineServices/DataPortal/DownLoadFile.ashx?fName=MasterLicenseData&type=C
https://cslb.ca.gov/OnlineServices/DataPortal/DownLoadFile.ashx?fName=WorkerCompData&type=C
https://cslb.ca.gov/OnlineServices/DataPortal/DownLoadFile.ashx?fName=PersonnelData&type=C
```

`type=C` is CSV, `type=E` is Excel. Note `WorkerCompData` is singular —
`WorkersCompData` returns HTTP 200 with an empty body rather than an error.

The handler ignores `Range` and streams the whole file regardless, so probing
the header means reading one chunk and hanging up.

Measured run of the master file: **77.9 MB, 244,471 licences, 64 seconds**, and
the page reports "Updated as of 8/24/2026" — same day, so it's refreshed daily.

**A caveat worth carrying into the schema:** the master list covers licences
"currently renewed, or *expired but renewable*". Cancelled, revoked, and
expired-non-renewable licences are **not** in the file. It is not a historical
archive, so a licence can disappear between refreshes.

### License master columns

51 columns. The ones that matter:

```
LicenseNo, LastUpdate, BusinessName, BUS-NAME-2, FullBusinessName, MailingAddress,
City, State, County, ZIPCode, country, BusinessPhone, BusinessType, IssueDate,
ReissueDate, ExpirationDate, InactivationDate, ReactivationDate, PendingSuspension,
PendingClassRemoval, PendingClassReplace, PrimaryStatus, SecondaryStatus,
Classifications(s), AsbestosReg, WorkersCompCoverageType, WCInsuranceCompany, …
```

This is everything DIR lacks — **County**, **City**, **BusinessPhone**, and
**Classifications(s)**. A recipient picker filtered by trade and geography can
be built off this file alone.

`PrimaryStatus` distribution across the 244,471 rows: `CLEAR` 230,959 (94.5%),
then a long tail of suspension reasons (`Contr Bond Susp` 7,972, `Work Comp
Susp` 3,503, …). Suspension values can themselves be multi-valued, separated the
same way as classifications.

Personnel and workers' comp files key on the same licence number
(`LIC-NO` / `LicenseNo`), so all three join cleanly.

## The trade vocabulary

This is what the recipient picker gets built on, so it was scraped from CSLB's
own pages rather than transcribed. `spike-cslb.ts classifications out.json`
produces the machine-readable list; `spike-cslb.ts vocabulary` reconciles it
against what actually appears in the data.

**Published: 113 codes.**

- **46 primary classifications** — `A` General Engineering, `B` General
  Building, `B-2` Residential Remodeling, `C` Specialty (the parent), and 42
  `C-*` specialties from `C-2` Insulation through `C-61` Limited Specialty.
- **2 certifications** — `ASB` Asbestos, `HAZ` Hazardous Substance Removal.
  These are certifications layered on a licence, not classifications; CSLB notes
  hazardous-substance certs are only issued to holders of `A`, `B`, `C-12`,
  `C-21`, `C-36`, `C-57`, or `C-61/D-40`.
- **65 C-61 "D" subcategories** — `D-1` … `D-65`. C-61 Limited Specialty is one
  licence classification subdivided for administrative tracking; **33 of the 65
  are retired** and redirect to another class.

### The data doesn't spell codes the way the pages do

The master file writes classifications inconsistently, and anything joining to
the published list has to normalise first:

| Shape | Example in data | Published as |
|---|---|---|
| Single-digit C | `C-8`, `C-7`, `C-9` | `C-8` — hyphen kept |
| Two-digit C | `C10`, `C12`, `C36` | `C-10` — hyphen dropped |
| C-61 subcategory | `D03`, `D06`, `D49` | `D-3`, `D-6`, `D-49` — zero-padded, hyphen dropped |
| Certifications | `ASB`, `HAZ` | unchanged |

Multi-class licences use `"| "` (pipe + space) as the separator:
`"A| B| C10| C36"`.

Normalising `^([A-Z])-?0*(\d+)$` to `$1-$2` resolves this completely: after
normalisation there are **zero** tokens in the data that aren't in the published
list (98 distinct codes observed, all accounted for).

### Retired codes are still live

21 retired C-61 subcategories still appear on current licences — this is not a
rounding error at the top:

```
D-49    2847  Tree Service (retired — now under C-49)
D-8       17  Doors and Door Services (retired — now under D-28)
D-22      12  Marble (retired — now under C-29)
D-48      10  Theater and School Equipment (retired — now under D-34)
D-7        9  Conveyors-Cranes (retired — now under D-21)
…
```

A picker that only offers current codes will silently miss 2,847 tree-service
contractors. The `supersededBy` mapping is captured in the classifications JSON
and needs to be applied as an alias when filtering.

15 published codes never appear in the data at all — `C` (the abstract
"Specialty Contractor" parent) plus 14 fully-retired D subcategories. Those
should not be offered as filter options.

## The match rate

`spike-cslb.ts match` against a 5,000-row strided sample of DIR rows that carry
a CSLB number, joined to the 244,471-licence master file on digits-only,
leading-zeros-stripped licence number:

```
DIR rows read                  5,000
... carrying a CSLB number     4,972  (99.4% of rows read)
... resolving in CSLB master   4,586  (92.2% of those)
... and currently clear/active 4,433  (89.2% of those)
```

The unresolved 7.8% are mostly free-text damage rather than genuine mismatches —
DIR takes the licence number as typed:

```
#1090893            We Build Group
0003512002-0001-0   High Tower Erectors Inc.
00584               RICARDO NEGRETE
```

Some of that is recoverable with better normalisation; some are numbers for
licences that are cancelled or revoked and therefore absent from the master file
by design.

### Which number is "the" match rate

The plan's decision rule — >85% build as designed, 60–85% needs a name-matching
fallback, <60% inverts to CSLB-primary — assumed a single number. There are two,
and they point different ways:

- **Join-key quality: 92.2%.** Given a DIR row with a CSLB number, we can resolve
  it. Comfortably above the 85% band.
- **End-to-end coverage: ~21.8% of all DIR rows** (23.7% carry a number × 92.2%
  resolve), or **~58% of currently-approved registrations** (63.2% × 92.2%).
  Below the 60% floor for the full table, and at the very bottom of the middle
  band for active registrations only.

Coverage is the binding constraint. Trade data for a DIR-primary design would be
missing for roughly four in five rows overall — and the trades are the entire
point of the recipient picker.

### Recommendation: invert the design

Three independent findings point the same way:

1. **Coverage.** DIR can only supply a trade for ~22% of its rows; CSLB has a
   classification for every one of its 244,471 licences.
2. **Fields.** DIR has no county, city, phone, or trade. CSLB has all four. A
   picker cannot be built on DIR's eight columns.
3. **Access.** DIR's portal disallows crawling and exposes rows only through an
   undocumented widget API. CSLB publishes a daily bulk file, free, from a stable
   handler, and explicitly invites the download.

So: **CSLB master file as the primary registry**, refreshed daily; **DIR as a
public-works-registration flag** resolved per contractor on the licence number.
That flag is genuinely valuable — it's how we know a contractor can legally bid
public work — but it's an attribute of a CSLB record, not the spine of the
schema.

The name-matching fallback the 60–85% band called for is still worth building,
but for a narrower job: attaching a DIR flag to CSLB licences where DIR left the
licence number blank or malformed. It is no longer on the critical path.

## Terms of use

Quoted rather than summarised. **Neither source states an explicit prohibition on
redistribution or commercial use**; the operative language on both sides is the
statewide public-domain clause. This is what the sources say, not a legal
opinion — worth a lawyer's eye before we resell the data as a product feature.

### Ownership — the operative clause

Identical text at [DIR Conditions of use](https://www.dir.ca.gov/od_pub/conditions.html)
and [CA.gov Conditions of use](https://www.ca.gov/legal/conditions-of-use/), which
is what CSLB's footer links to:

> In general, information presented on this web site, unless otherwise indicated,
> is considered in the public domain. It may be distributed or copied as
> permitted by law. However, the State does make use of copyrighted data (e.g.,
> photographs) which may require additional permissions prior to your use. In
> order to use any information on this web site not owned or created by the
> State, you must seek permission directly from the owning (or holding) sources.

Note the two qualifiers: *"unless otherwise indicated"* and *"as permitted by
law"*. Neither is defined further on the page. The Use Policy itself is dated
December 7, 2000 and states it is "subject to change without notice".

### Limitation of liability

> The State makes no claims, promises, or guarantees about the absolute accuracy,
> completeness, or adequacy of the contents of this web site and expressly
> disclaims liability for errors and omissions in the contents of this web site.
> No warranty of any kind, implied, expressed, or statutory, including but not
> limited to the warranties of non-infringement of third party rights, title,
> merchantability, fitness for a particular purpose, and freedom from computer
> virus, is given with respect to the contents of this web site or its hyperlinks
> to other Internet resources.

### DIR-specific

[DIR Disclaimer](https://www.dir.ca.gov/od_pub/disclaimer.html), dated 8/2/2013:

> The information posted on this website is provided free of charge by the
> Department of Industrial Relations (DIR) for the convenience of members of the
> public. We strive to make the information as accurate as possible. However, we
> cannot guarantee that all of the information is complete and up-to-date. We
> will correct errors that come to our attention, and we welcome members of the
> public to inform of us of errors by email at webmaster@dir.ca.gov.

And the access constraint, which is a term in practice even though it isn't
phrased as one:

> ```
> https://services.dir.ca.gov/robots.txt
> User-agent: *
> Disallow: /
> ```

### CSLB-specific

From all three Data Portal pages:

> **Fee**
> There is no charge for this service.

> NOTE: Email addresses are not provided (Business & Professions Code Section 27)

> **Disclaimer** (Please read)
> The information provided is current at the time the list is downloaded. Changes
> to a contractor's license status can occur at any time. To verify the current
> status of a license, use our Instant License Check feature.

The last one has a product consequence: a cached copy is stale the moment it
lands, so anything user-facing that asserts a licence is valid *right now* should
say when the snapshot was taken, or re-check live.

CSLB's footer links its Conditions of Use to the statewide
[ca.gov](https://www.ca.gov/legal/conditions-of-use/) page — there is no separate
CSLB terms document. `cslb.ca.gov/Resources/Conditions_Of_Use.aspx` 404s.

## Reproducing this

```sh
# DIR
node scripts/registry/spike-dir.ts probe          # endpoint, fields, robots.txt, legacy app
node scripts/registry/spike-dir.ts counts         # the wildcard test + coverage numbers
node scripts/registry/spike-dir.ts search "smith" 2
node scripts/registry/spike-dir.ts sample 5000 dir-sample.ndjson

# CSLB
node scripts/registry/spike-cslb.ts portal
node scripts/registry/spike-cslb.ts classifications cslb-classifications.json
node scripts/registry/spike-cslb.ts master MasterLicenseData.csv        # ~78 MB
node scripts/registry/spike-cslb.ts vocabulary MasterLicenseData.csv cslb-classifications.json
node scripts/registry/spike-cslb.ts match dir-sample.ndjson MasterLicenseData.csv
```

No env vars, no database, no credentials. Write the large files somewhere
outside the repo.

One environment quirk: `www.cslb.ca.gov` did not resolve from the machine this
ran on (the VPN resolver has no A record for it) while the apex `cslb.ca.gov`
did, and the apex serves the same app. The scripts use the apex host throughout.
