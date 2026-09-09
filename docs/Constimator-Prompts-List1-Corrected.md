# List 1 — corrected Cursor prompts

Supersedes the `LIST 1` section of `Constimator-Implementation-Prompts.md`.
Every "Current" claim below was checked against the code on 8 Sep 2026.

Paste one block into a **new** chat. One item per chat. Do them in the order given.

**Order: 1.2 → 1.1 → 1.3 → 1.5 → 1.4 → 1.7 → 1.6 (branch, hold merge) → 1.8.**
1.2 is the only item that changes what lands in the database — do it while fresh.
1.6 must not merge until 1.8 passes.

---

### Prompt 1.2 — Import preview: confidence, notes, page, skip rows

```
PROMPT 1.2 — Import preview: confidence, notes, source page, skip rows

Implement ONLY this item. Do not start 1.1 or 1.3.

House rules:
- Read node_modules/next/dist/docs/ before changing App Router / Server Actions.
- Org data only through getScopedDb() in lib/db/scoped.ts. Never import the raw Drizzle client.
- Validate Server Action input with zod + parseInput from lib/validation.ts.
- Match existing UI. No unrelated refactors.

Verified current state:
- components/reconciliation/bid-form-import-card.tsx renders only 4 columns
  (#, Description, Unit, Qty) and always sends extraction.items in full.
  Its row key today is `item.itemNumber + item.description`.
- lib/bid-form-import.ts extractedBidItemSchema ALREADY has optional
  confidence, sourcePage, notes. No worker or schema change is needed.
- app/reconciliation/actions.ts importBidFormSchema.items is
  z.array(extractedBidItemSchema).min(1, "Nothing to import") — an empty
  array throws server-side, so the disabled button is the real guard.
- Thresholds are already duplicated in this codebase: LOW_CONFIDENCE = 90 in
  components/plan-holders/holder-row.tsx, and 70/50 in lib/quote-review.ts.

Change:

1. lib/bid-form-import.ts
   - export const LOW_CONFIDENCE = 90
   - export function itemKey(item, index): `${item.itemNumber}::${item.description}`,
     falling back to `${index}` when that key is not unique within the list.
     Compute keys for the whole array in one pass so collisions are detectable.
   - export function filterSkipped(items, skippedKeys: Set<string>): PendingBidFormItem[]
     Filtering must NOT live only in React — 1.7 tests this directly.

2. components/reconciliation/bid-form-import-card.tsx
   - Local state: skippedItemKeys: Set<string>
   - Columns: # | Description | Unit | Qty | Conf | Notes
   - Under the description, when sourcePage is present, show a muted `p.{sourcePage}`.
   - Confidence cell: null/undefined -> "—"; < LOW_CONFIDENCE -> text-warning;
     >= LOW_CONFIDENCE -> muted tabular-nums.
   - A checkbox per row toggles skip. Use the shared itemKey() for both the React
     key and the skip set so they cannot drift.
   - Button label: `Import ${selectedCount} items`; disabled when selectedCount === 0.
   - Send filterSkipped(extraction.items, skippedItemKeys) as the items payload.
   - Keep the existing "Replace existing bid form" branch working with the same
     filtered list.

3. app/reconciliation/actions.ts
   - No schema change. Optionally add skippedCount to the bid_form_imported
     captureEvent properties (it already sends projectId, documentId, itemCount, replaced).

4. Import LOW_CONFIDENCE from lib/bid-form-import.ts. Do NOT hard-code 90 a fourth time.

Done when:
An 88-confidence row is visually flagged, and unchecking a row means it is not in
the bid table after import.

Do not add per-cell editing to the preview — editing after import already exists.
Do not auto-import without the confirm click.
```

---

### Prompt 1.1 — Reconciliation empty state: push import, not typing

```
PROMPT 1.1 — Reconciliation empty state: push import, not typing

Implement ONLY this item.

House rules:
- Read node_modules/next/dist/docs/ before changing App Router / Server Actions.
- Org data only through getScopedDb(). Match existing UI patterns. No unrelated refactors.

Verified current state — components/reconciliation/reconciliation-shell.tsx:
- line 77:  const hasBidForm = bidRows.length > 0
- line 151: {pendingExtractions.length > 0 ? <BidFormImportCard .../> : null}
- line 158: {!hasBidForm ? ( ... ) — this branch renders an Empty whose title is
  "No official bid form entered yet" and whose description is "Enter the official
  bid form's line items below to reconcile them against your estimate."
The bug: when an extraction is pending, the import card renders and THEN that
"enter the line items" empty state renders under it, telling people to type
even though extraction is ready.
Empty/EmptyHeader/EmptyMedia/EmptyTitle/EmptyDescription, Button and useRouter
are already imported in this file.

Change — inside the !hasBidForm branch only:
1. When pendingExtractions.length > 0:
   - Title: "Extracted bid form ready to import"
   - Description: "Review the table above, then import. You can edit any row after."
   - No upload button here (the import card is the action).
2. When pendingExtractions.length === 0:
   - Title: "No official bid form yet"
   - Description: "Upload the official bid form under Upload Documents (type
     Official Bid Form). When extraction finishes, import it here. Typing rows
     is only a fallback."
   - Button: onClick={() => router.push(`/upload?project=${projectId}`)}
     labeled "Upload bid form".
3. Keep the <Card> with BidLineTable below in BOTH cases — typing stays available
   as a fallback, it just stops being the headline.

Files: components/reconciliation/reconciliation-shell.tsx only.

Done when: with a completed bid-form job and zero bid rows, the first thing on the
page is the import card, and nothing tells you to type.
```

---

### Prompt 1.3 — Confidence column on the official bid-line table

```
PROMPT 1.3 — Show extraction confidence on the official bid-line table

Implement ONLY this item. No migration — the column already exists.

Verified current state:
- db/schema.ts line 735: bids.extractionConfidence is numeric("extraction_confidence").
  Drizzle returns numeric as `string | null`, NOT a number. Coerce before comparing.
- components/reconciliation/bid-line-table.tsx line 26:
  type BidRow = typeof bids.$inferSelect
  So row.extractionConfidence is ALREADY available on every row.
  You do NOT need to thread a new prop, change the parent, or touch openEdit /
  BidLineDialog. Ignore any instruction that says openEdit must pass it.
- Header row is at lines 94-99: Item # | Description | Unit | Official Qty | Spec | (actions)
- Body cells are at lines 104-116.

Change:
- Add a narrow "AI conf" TableHead immediately after "Official Qty", and the
  matching TableCell after the officialQuantity cell.
- Render: row.extractionConfidence == null -> "—"
          Number(row.extractionConfidence) < LOW_CONFIDENCE -> text-warning
          otherwise -> muted tabular-nums
- Import LOW_CONFIDENCE from lib/bid-form-import.ts (added in 1.2). If 1.2 is not
  merged yet, add the export there now rather than hard-coding 90.
- Manually typed rows have documentId null and confidence null and must show "—".
- Do NOT add a notes column. Notes are not stored on the bid table today.

Files: components/reconciliation/bid-line-table.tsx

Done when: imported rows show 94 / 88 / etc. with 88 flagged, and typed rows show —.
```

---

### Prompt 1.5 — Processing page next step when a bid form is extracted

```
PROMPT 1.5 — Processing page: next step when a bid form is extracted

Implement ONLY this item. Do not change the e2e fixture document type.

House rules:
- Read node_modules/next/dist/docs/ before touching the processing page.
- Org data only through getScopedDb(). Validate action input with parseInput.

Verified current state — this is the part the older prompt got wrong:
- app/processing/actions.ts lines 23-28: ProcessingItem is
  { documentId, fileName, status, error } — it does NOT carry the job kind.
  getProcessingStatus (line 78) maps documents to that shape and drops
  job.result entirely. So the shell currently CANNOT tell a finished bid-form
  extraction from a finished plan takeoff. You must add it.
- The same file already reads job.result?.kind at line 67 for the plan_takeoff
  allowlist, so the field is present on the row — it is just not returned.
- components/processing/processing-shell.tsx has no mention of bid_form or
  reconciliation anywhere. Completion copy is at lines 133-137; the footer
  buttons that router.push to /schedules and /intelligence are at lines 228-236.

Change:
1. app/processing/actions.ts
   - Add `kind: string | null` to ProcessingItem.
   - In getProcessingStatus, populate it from job?.result?.kind ?? null.
   - Do not change syncEstimateFromCompleteJobs or its plan_takeoff allowlist.
2. components/processing/processing-shell.tsx
   - When at least one item has status === "complete" && kind === "bid_form",
     render one line in the completed state:
     "Bid form extracted — open Bid Reconciliation to import."
     with a link/button to `/reconciliation?project=${projectId}` (match how the
     existing footer buttons build their project query).
   - Show it only in the terminal/complete state, next to the existing copy.
     Do not replace the existing continue buttons.

Done when: a PDF uploaded as Official Bid Form finishes processing and the page
gives a clear next step to /reconciliation.
```

---

### Prompt 1.4 — Optional "seed the estimate" after import

```
PROMPT 1.4 — Optional "create estimate lines from this schedule" after import

Implement ONLY this item. Read the gotcha below before you write any code.

Verified current state:
- app/estimate/actions.ts line 258:
  importFromBidScheduleAction(rawProjectId: string) — takes a plain string,
  returns { added, bidLineCount }.
  It creates estimate lines with source: "official", quantity = official quantity,
  unitPrice: "0", and skips bids already linked by bidId or by a unique
  description match.
- components/estimate/estimate-shell.tsx already exposes this as
  "Import from Bid Schedule".

GOTCHA you must design around:
lib/bid-form-import.ts pendingBidFormExtractions() excludes any document that
already has a bid row pointing at it. The import card calls router.refresh()
on success, pendingExtractions becomes empty, and BidFormImportCard returns null
and unmounts. A seed button rendered "after successful import" inside that card
would disappear before anyone can click it.

Pick ONE of these and say which you chose:
(a) Keep a local `importedDocumentId` state in BidFormImportCard, and while it is
    set, render a small post-import panel instead of returning null — even when
    the extraction prop is gone. Refresh only after the user is done.
(b) Hoist the post-import panel into ReconciliationShell so it survives the
    refresh, driven by a callback from the card.
(b) is cleaner if the card starts fighting its own unmount.

Change:
- Secondary button: "Create estimate lines from this schedule"
- onClick: importFromBidScheduleAction(projectId)
- Toast on added > 0: `Added ${added} estimate lines at $0 — price them in Estimate Workspace.`
- Toast on added === 0: "Estimate already has those items."
- Errors go through the same toast.error pattern the card already uses.
- Do NOT auto-seed without a click. Zero-price lines look like a real estimate.

Done when: import -> click seed -> /estimate has one line per bid item at $0,
linked by bidId, and the button was actually reachable in the UI.
```

---

### Prompt 1.7 — Unit tests

```
PROMPT 1.7 — Unit tests for bid-form pending detection and mapping

Implement ONLY tests. If a test proves a real bug in lib/bid-form-import.ts,
fix that function and say so — do not weaken the test to make it pass.
Do not build UI.

File: lib/bid-form-import.test.ts (extend). Under test: lib/bid-form-import.ts
Runner: vitest. Run with `pnpm test lib/bid-form-import.test.ts`.

Verified current state — the file already has a shared `job` fixture at the top
(doc-1, status complete, kind bid_form, one Mobilization item at confidence 94)
and these tests:
  pendingBidFormExtractions
    - "returns complete bid-form jobs that have not been imported"
    - "skips documents that already have bid rows"
    - "ignores plan takeoff results"
  bidRowsFromExtractedItems
    - "maps extracted items onto bid-table columns"
Reuse that fixture with spreads rather than redeclaring it.

Add:
- Latest job wins when one document has two jobs. latestJobForDocument sorts by
  createdAt desc — assert the newer job's items come back, not the older.
- status "failed" and status "queued" jobs are ignored (only "complete" counts).
- result.bidItems: [] -> document is NOT pending.
- An invalid item (missing description) makes the whole array safeParse fail, so
  the document is NOT pending. Assert the all-or-nothing behaviour explicitly —
  silently dropping bad rows would be worse than showing nothing.
- bidRowsFromExtractedItems: an item with no confidence -> extractionConfidence: null
  (and one with confidence 94 -> the string "94", since the column is numeric).
- filterSkipped (from 1.2): all selected; one skipped; all skipped returns [].
- itemKey (from 1.2): two rows with identical itemNumber AND description get
  distinct keys.

Done when: pnpm test lib/bid-form-import.test.ts passes with every case above.
```

---

### Prompt 1.6 — Marketing and pilot copy

```
PROMPT 1.6 — Marketing and pilot copy: upload/import is the primary path

Copy changes only. No feature work. No component restructuring.

DO THIS ON A BRANCH AND DO NOT MERGE IT until 1.8 has passed on at least 3 real
bid-form PDFs. This copy claims the extraction works; 1.8 is what proves it.
Name the branch copy/bid-form-import-primary.

Verified current state:
- components/how-it-works.tsx line 3 carries a comment saying line items are
  entered by hand and there is no upload-and-auto-fill yet. Step 01 (line 8) is
  titled "Enter the official bid form".
- components/faq.tsx line 24 ("What documents does it need?") says the official
  bid form is the one that matters "and you enter its line items directly".
- docs/PILOT_CHECKLIST.md line 53, step 5, leads with entering line items by hand.
  Line 13 already mentions importing AI-extracted items as an alternative.

Change:
1. how-it-works.tsx step 01 -> "Upload the official bid form." Body: Constimator
   reads the schedule; you confirm and import. Typing is only if you have no PDF.
   Update the stale comment on line 3 in the same edit so it stops contradicting
   the component.
2. faq.tsx "What documents does it need?" -> the official bid form is uploaded and
   imported after review, not only typed.
3. PILOT_CHECKLIST.md step 5 -> import after review is primary; typing is fallback.

Do NOT touch faq.tsx line 29 (the "reads your plans" answer). That one is
deliberately cautious about plan reading and is still accurate.
Do not claim accuracy numbers anywhere. Do not say "automatic" — the confirm
click is the product.

Done when: a contractor reading the site is not told to retype 80 lines, and
nothing on the site promises more than review-then-import.
```

---

### Prompt 1.8 — Real-PDF validation

```
PROMPT 1.8 — Validate bid-form extraction on real PDFs

This is a measurement pass, not a feature. Do not add product features.
Do not change the extractor except for the one max_tokens case below.

Verified current state: the harness is already built and needs no code.
- scripts/real-job/upload.ts and scripts/real-job/compare.ts both exist.
- compare.ts already emits per-row verdicts (exact / quantity_mismatch /
  unit_mismatch / MISSING / EXTRA) plus a summary and a confidence split, and
  writes a JSON/CSV report to scripts/real-job/reports.
- scripts/real-job/.gitignore already excludes pdfs/, expected/, reports/ and
  *.pdf. The directories do not exist yet — create them; they stay untracked.
  These are customer/agency project data. Do not commit them, do not paste
  their contents into a chat, and do not attach them to an issue.

Steps:
1. mkdir scripts/real-job/pdfs scripts/real-job/expected
2. Start the worker: cd worker && npm run dev
3. For each real bid form (at least 3, clean digital PDFs, different agencies —
   Caltrans / county / city behave differently):
   node --env-file=.env.local scripts/real-job/upload.ts ./scripts/real-job/pdfs/<file>.pdf --type bid_form
   The type MUST be bid_form. Anything else runs plan takeoff, not transcription.
4. Key the correct schedule into scripts/real-job/expected/<name>.csv.
   Headers are matched loosely: item/item_number, description, unit, quantity,
   spec_section.
5. node --env-file=.env.local scripts/real-job/compare.ts --document <id> --expected ./scripts/real-job/expected/<name>.csv
   Add --org <slug> if the database has more than one org.
   Default quantity tolerance is 0 (exact); use --tolerance-pct only if you say so
   in the writeup.

Record per package: total rows, MISSING, EXTRA, quantity mismatches, unit
mismatches, and mean confidence on correct rows vs wrong rows.

That last number is the one that matters. A wrong row that came back at 70 is
survivable because the reviewer sees the flag. A wrong row at 95 is not. If
confidence does not separate right from wrong, say so plainly — that is a
finding, not a failure of the exercise.

If long schedules truncate mid-list: raise max_tokens in
worker/src/extract-bid-form.ts (currently 16000, line 97) and re-run. Do not
switch to silent auto-import. Do not add chunking in this pass.
If a file was uploaded as Plans or Other: re-upload it as Official Bid Form.
Never feed plan-takeoff items into the bid table.

Report the numbers in chat. Do not write a summary doc unless asked.
Report failures as prominently as successes — the whole point of this item is
to find out whether the claim in 1.6 is true before it ships.

Done when: 3 real packages have been run, and for each one you can say whether it
was importable and whether its wrong rows were low-confidence or noted.
```
