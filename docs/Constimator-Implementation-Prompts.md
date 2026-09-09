# Cursor prompts — one chat per item

Copy everything inside each `PROMPT` fence into a **new** Cursor chat. Do them in order. Do not paste two prompts into one chat.

**Client freeze (8 Sep 2026):** implement **List 1 only**, including 1.8. Do not paste List 2, 3, or 4 prompts until the client unfreezes after this week’s prime demos.

Shared house rules are inside every prompt so each chat stands alone.

---

## LIST 1 — Bid-form auto-fill (ACTIVE)

Paste order: **1.1 → 1.2 → 1.3 → 1.4 → 1.6 → 1.7 → 1.5 → 1.8**

### Prompt 1.1

```
PROMPT 1.1 — Reconciliation empty state: push import, not typing

Implement ONLY this item. Do not start 1.2, 1.3, or any other list. Do not change the extractor, import action, or BidFormImportCard internals.

House rules:
- Read node_modules/next/dist/docs/ before changing App Router or Server Actions.
- Org-scoped data only through getScopedDb() in lib/db/scoped.ts. Never import the raw Drizzle client from app code.
- Match existing UI (Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent from components/ui/empty.tsx; Button from components/ui/button.tsx).
- No unrelated refactors. No silent auto-import.

Context:
Bid-form AI extraction and import already exist:
- worker/src/extract-bid-form.ts → extractBidForm()
- worker/src/process-job.ts when document.type === "bid_form"
- lib/bid-form-import.ts → pendingBidFormExtractions()
- components/reconciliation/bid-form-import-card.tsx
- app/reconciliation/actions.ts → importExtractedBidFormAction()

Critical routing fact: if the uploaded file is NOT typed Official Bid Form (bid_form), the worker runs plan-sheet takeoff instead. pendingBidFormExtractions then ignores it because kind !== "bid_form". Do not “fix” that by feeding takeoff items into bid.

Current problem:
components/reconciliation/reconciliation-shell.tsx (~lines 151–171).
If pendingExtractions.length > 0, BidFormImportCard renders, THEN the empty state still says:
  Title: “No official bid form entered yet”
  Description: “Enter the official bid form’s line items below to reconcile them against your estimate.”
That tells people to type even when extraction is ready. ReconciliationShell already has useRouter from next/navigation.

Change only components/reconciliation/reconciliation-shell.tsx:

1. If pendingExtractions.length > 0 AND !hasBidForm:
   - Empty title: “Extracted bid form ready to import”
   - Description: “Review the table, then import. You can edit any row after.”
   - Do NOT use “Enter line items” / “Enter the official bid form” as the primary message.
   - BidFormImportCard stays above this empty state (already rendered).

2. If no pending extraction AND no bid form:
   - Title: “No official bid form yet”
   - Description: “Upload the official bid form under Upload Documents (type Official Bid Form). When extraction finishes, import it here. Typing rows is only a fallback.”
   - Button in EmptyContent: labeled “Upload bid form”, onClick router.push(`/upload?project=${projectId}`). Use withProjectQuery from lib/project-scope.ts if that is the existing pattern; otherwise `/upload?project=${projectId}` is correct.

3. Keep BidLineTable below as fallback in BOTH cases (pending import, and no extraction). Typing remains available; it is just not the headline.

Do not change the hasBidForm branch (reconciliation result UI).

Done when: with a completed bid-form job and zero bid rows, the first thing you see is the import card, not “type it in.”

Do not auto-import without a confirm click. Do not change the extractor.
```

### Prompt 1.2

```
PROMPT 1.2 — Import preview: confidence, notes, page, skip rows

Implement ONLY this item. Assume 1.1 is done or ignore it. Do not start 1.3. Do not add per-cell edit in the preview (edit after import already exists).

House rules:
- Read node_modules/next/dist/docs/ before App Router / Server Action changes.
- Org data only via getScopedDb() in lib/db/scoped.ts. Validate Server Actions with zod + parseInput from lib/validation.ts.
- Match existing UI. Warning color is text-warning. LOW_CONFIDENCE = 90 — same cutoff as components/plan-holders/holder-row.tsx.
- Use Checkbox from components/ui/checkbox.tsx. Match existing Table markup in bid-form-import-card.tsx.
- No unrelated refactors. No silent auto-import.

Current:
components/reconciliation/bid-form-import-card.tsx shows columns #, Description, Unit, Qty only and always sends extraction.items in full to importExtractedBidFormAction.
lib/bid-form-import.ts extractedBidItemSchema already has confidence, sourcePage, notes.
app/reconciliation/actions.ts importExtractedBidFormAction already takes items (zod array min 1). bid.extraction_confidence is stored via bidRowsFromExtractedItems. Analytics event "bid_form_imported" already fires with projectId, documentId, itemCount, replaced.

Change:

1. In lib/bid-form-import.ts add a pure helper:
   filterSkipped(items, skippedKeys: Set<string> | Iterable<string>)
   Row key = `${itemNumber}::${description}`. If two rows would collide, include the index: `${itemNumber}::${description}::${index}` — use the same key function in the React table.
   Skipped keys are excluded. All skipped → [].
   Export the key helper if the card needs it so keys cannot drift.

2. In components/reconciliation/bid-form-import-card.tsx:
   - Local state skippedItemKeys: Set<string> (or Record/key set). Default: nothing skipped.
   - Table columns: # | Description | Unit | Qty | Conf | Notes.
   - Under description, if sourcePage is present, show muted “p.{sourcePage}”.
   - Confidence cell: null/undefined → “—”; < 90 → text-warning tabular number; >= 90 → muted tabular number.
   - Checkbox (or Skip control) per row. Checked = include (or unchecked = skip — pick one and make the label obvious). Skipped rows are excluded from the action payload.
   - Import button label: “Import N items” where N = not skipped. Disable if N === 0 (importExtractedBidFormAction rejects empty items arrays).
   - Replace-existing button (when hasExistingBidForm) must also use the filtered list and the same N.
   - Pass only selected items into importExtractedBidFormAction.

3. In app/reconciliation/actions.ts, optionally add skippedCount to bid_form_imported properties:
   skippedCount: original payload length minus imported length, or pass it from the client if you add it to the schema. Do not require a schema migration.

Tests in lib/bid-form-import.test.ts for filterSkipped:
- All selected → same items
- One skipped → that item gone
- All skipped → []

Done when: an 88-confidence row is visually flagged; unchecking/skipping it means it is not in bid after import.

Do not change the worker extractor. Do not auto-import.
```

### Prompt 1.3

```
PROMPT 1.3 — Show extraction confidence on the official bid-line table

Implement ONLY this item. Do not start 1.4. No schema migration — column already exists.

House rules:
- Org data only via getScopedDb() if you touch actions (you should not need to).
- No new tables. Do not add a notes column on bid.
- Match 1.2 confidence styling: LOW_CONFIDENCE = 90, text-warning below that, muted tabular at/above, “—” when null.

Current:
components/reconciliation/bid-line-table.tsx table columns are Item #, Description, Unit, Official Qty, Spec, Actions.
openEdit(row) passes id, itemNumber, description, unit, officialQuantity, specSection — not extractionConfidence.
Schema already has bids.extractionConfidence in db/schema.ts (~line 735). BidRow is typeof bids.$inferSelect so the field is already on the row.

Change only components/reconciliation/bid-line-table.tsx (and bid-line-dialog.tsx ONLY if the edit form would otherwise wipe extractionConfidence on save — if updateBidLineAction’s schema omits extractionConfidence, leave it; do not start writing confidence in the edit dialog).

- Add a narrow “AI conf” column after Official Qty.
- Same < 90 warning styling as the import card (text-warning).
- Manual / typed rows (documentId null, or extractionConfidence null) show “—”.
- Do NOT add a notes column. Confidence-only.

Done when: imported rows show 94 / 88 / etc.; typed rows show —.

Do not change import mapping. bidRowsFromExtractedItems already writes extractionConfidence.
```

### Prompt 1.4

```
PROMPT 1.4 — Optional “seed estimate from this schedule” after bid-form import

Implement ONLY this item. Do not auto-seed. Do not start 1.5.

House rules:
- Read node_modules/next/dist/docs/ if you touch Server Actions.
- Reuse existing importFromBidScheduleAction in app/estimate/actions.ts. Do not duplicate that logic.
- Org data via getScopedDb() (already used inside that action).
- Zero-price lines look like a real estimate — require an explicit click.

Current:
Estimate Workspace already has “Import from Bid Schedule” in components/estimate/estimate-shell.tsx calling importFromBidScheduleAction(projectId).
That action creates estimate lines with source: "official", quantity = official quantity, unitPrice: "0", total: "0". It skips bids already linked by bidId, and unique description matches get a bidId link instead of a new line. Returns { added, bidLineCount }.

BidFormImportCard in components/reconciliation/bid-form-import-card.tsx currently toasts success and router.refresh() after import. It has no seed-estimate control.

Change in components/reconciliation/bid-form-import-card.tsx:
- After a successful import, show a secondary button: “Create estimate lines from this schedule”.
- On click, call importFromBidScheduleAction(projectId).
- Toast if added > 0: “Added N estimate lines at $0 — price them in Estimate Workspace.”
- Toast if added === 0: “Estimate already has those items.”
- Then router.refresh().
- Do NOT call the seed action automatically after import.
- Disable the seed button while import or seed is pending.
- Import the action from @/app/estimate/actions — Server Actions may be imported into a client component the same way estimate-shell.tsx already does.

Done when: Import → click seed → /estimate has one line per bid item at $0, linked by bidId (except rows skipped by the existing unique-description match behavior).

Do not change importFromBidScheduleAction’s matching rules.
```

### Prompt 1.5

```
PROMPT 1.5 — Processing page next-step when bid form is extracted

Implement ONLY this item. Do not change e2e fixture types (e2e/full-flow.spec.ts). Do not start 1.6.

House rules:
- Read node_modules/next/dist/docs/ if you touch the processing page or Server Actions.
- Org data only via getScopedDb() in lib/db/scoped.ts.
- Validate action input with zod + parseInput from lib/validation.ts.
- Do not feed bid_form results into generateEstimateFromTakeoff. syncEstimateFromCompleteJobs in app/processing/actions.ts already allowlists plan_takeoff only — keep that.

Current:
If a document is not typed bid_form, worker/src/process-job.ts runs plan takeoff, not bid-form transcription.
Upload checklist already includes Official Bid Form (components/upload/upload-shell.tsx). Keep the existing warning if they continue without marking a bid form.

app/processing/actions.ts ProcessingItem is currently:
  { documentId, fileName, status, error }
It does NOT include result.kind. getProcessingStatus maps docs + latestJob and drops kind. You must add kind (or isBidForm) so the UI can tell a completed bid-form job from plan takeoff.

components/processing/processing-shell.tsx complete-state copy is “Processing complete” / “All documents processed.” Footer buttons go to /schedules and /intelligence only — no Bid Reconciliation next step.

Change:
1. Extend ProcessingItem with kind from job.result?.kind (string | null / undefined is fine). Pass it from getProcessingStatus. Do not change retryTakeoffJobAction behavior.
2. In components/processing/processing-shell.tsx, after processing completes (allTerminal, or at least when any item is complete with kind === "bid_form"):
   Add a one-line: “Bid form extracted — open Bid Reconciliation to import.”
   Link/button to Bid Reconciliation using withProjectQuery("/reconciliation", projectId) from lib/project-scope.ts, or `/reconciliation?project=${projectId}` matching the existing footer buttons that already use `?project=${projectId}`.
3. Show that line when a bid_form job is complete even if other documents are still running, if that is easy; otherwise showing it when allTerminal && any bid_form complete is enough.

Done when: a correctly typed bid-form PDF ends with a clear next step to /reconciliation.

Do not auto-import. Do not change the worker.
```

### Prompt 1.6

```
PROMPT 1.6 — Marketing and pilot copy: upload/import is the primary path

Implement ONLY copy changes. No feature work. No extractor changes. Do not start 1.7.

Current (wrong: tells contractors to retype 80 lines):
- components/how-it-works.tsx step 01 title is “Enter the official bid form”, description is item-by-item typing. The file comment says there is no upload-and-auto-fill and that this is deliberate. That comment is now false — extraction + confirm import exist.
- components/faq.tsx question “What documents does it need?” says “you enter its line items directly.”
- docs/PILOT_CHECKLIST.md step 5 leads with “Enter the official bid form’s line items” and treats import as an afterthought.

Change:

1. components/how-it-works.tsx
   - Delete or rewrite the comment that says there is no upload-and-auto-fill.
   - Step 01 title: “Upload the official bid form”
   - Description: Constimator reads the schedule; you confirm and import. Typing is only if you have no PDF.

2. components/faq.tsx — “What documents does it need?”
   Official bid form is uploaded (type Official Bid Form) and imported after review, not only typed. Typing remains a fallback. Plans/specs/addenda can still be uploaded.

3. docs/PILOT_CHECKLIST.md
   - Scope line that says “Entering the official bid form’s line items by hand, or importing…” — make import-after-review primary.
   - Step 5: import after review is primary; typing is fallback.
   Do not claim the extractor is proven on real PDFs until 1.8 is done. You may say they confirm and import; do not say “reliable” / “bet a bid on extraction.”

Done when: a contractor reading the site is not told to retype 80 lines as the main path.

Do not change components/features.tsx legal/honesty language. Do not add new routes.
```

### Prompt 1.7

```
PROMPT 1.7 — Unit tests for pendingBidFormExtractions, bidRowsFromExtractedItems, filterSkipped

Implement ONLY tests, plus a tiny helper fix if a test proves a real bug in existing mapping. Do not build new UI. Do not start 1.8.

File: lib/bid-form-import.test.ts (extend). Logic under test: lib/bid-form-import.ts

House rules:
- Follow existing vitest style in this file (describe/it, no extra frameworks).
- Do not silently drop invalid rows in production code to make a test pass. Current pendingBidFormExtractions uses z.array(extractedBidItemSchema).safeParse on the whole array — if one item is invalid, the document is not pending. Tests must assert that.

Current tests already cover:
- pending job returned
- skip if documentId already on a bid
- ignore plan_takeoff
- bidRowsFromExtractedItems maps fields including confidence

Add:
- Latest job wins if two jobs exist for one document (pendingBidFormExtractions already uses latestJobForDocument sorted by createdAt desc — assert the newer complete bid_form result is used).
- Failed jobs ignored (status !== "complete").
- Queued jobs ignored.
- Empty bidItems → not pending.
- Invalid item (missing description) → whole parse fails, document not pending. Do NOT change production code to skip-bad-rows-silently.
- bidRowsFromExtractedItems: missing confidence → extractionConfidence: null.
- If filterSkipped exists from 1.2, keep/ensure: all selected; one skipped; all skipped returns [].

Run:
pnpm test lib/bid-form-import.test.ts

Done when that file is green and the new cases exist.
```

### Prompt 1.8

```
PROMPT 1.8 — Validate bid-form extraction on real PDFs (not a product feature)

This is a validation pass. Do NOT add product features, silent auto-import, Excel/Word parsers, or plan-takeoff-as-schedule. Follow scripts/real-job/README.md.

Client requirement: do not tell any contractor bid-form auto-fill is reliable until this is done and written down.

House rules:
- Worker must be running against the same DB as .env.local: cd worker && npm run dev
- Upload type MUST be bid_form. If the file was Plans/Other, re-upload as Official Bid Form. Do not feed takeoff items into bid.
- scripts/real-job/pdfs/, expected/, and reports/ are gitignored. Do not commit real bid PDFs or answer keys.
- node scripts/real-job/make-sample.mjs is plumbing only. It does NOT count toward the 3 real packages.

Steps:
1. Confirm worker is running (`cd worker && npm run dev`). If Railway worker is on the same DB it may claim the job — that is OK (same code) or stop it if you need to watch local logs.
2. Place at least 3 real civil / DOT / county Official Bid Form PDFs (clean digital, not scans-of-scans if you can avoid them) in scripts/real-job/pdfs/.
3. For each file:
   node --env-file=.env.local scripts/real-job/upload.ts ./scripts/real-job/pdfs/<file>.pdf --type bid_form
4. Key an answer CSV of what is actually printed on the form under scripts/real-job/expected/ (gitignored). Headers matched loosely (item/item_number, description, unit, quantity/qty). Description, unit, and quantity are required.
5. Compare:
   node --env-file=.env.local scripts/real-job/compare.ts --document <id-from-upload> --expected ./scripts/real-job/expected/<name>.csv
6. Record for each package: row count, MISSING, EXTRA, QTY, UNIT, mean confidence on ok vs wrong.

If long schedules truncate mid-list: raise max_tokens in worker/src/extract-bid-form.ts (currently 16000) and re-run. Do NOT add silent auto-import. Do not switch extractors.

If no real PDFs are in the repo, say so and stop rather than scoring the synthetic sample as 1.8.

Write a short results note in the chat (and only create a markdown file if asked). For each of 3 packages: importable yes/no; wrong rows and whether they were low-confidence (< 90) or noted.

Done when: 3 real packages are scored, and wrong rows are low-confidence or explicitly noted. That note is what we send the client.
```

---

## LIST 2 — Who to list (PARKED)

**Do not paste these until the client unfreezes Lists 2–4.** Plan holders + quote compare already exist for this week’s demos. Do not polish them now.

Do not build CSLB/DIR/DBE registry, contractor matching, or “list these companies.” Copy must say this is **not** a listing-form recommendation.

Paste order when unfrozen: **2.1 → 2.2 → 2.3 → 2.5 → 2.4 → 2.6**

### Prompt 2.1

```
PROMPT 2.1 — Plan holders empty / pending copy and next actions

Implement ONLY this item. Do not add Confirm remaining, CSV export, or invites. Do not start List 3.

House rules:
- Read node_modules/next/dist/docs/ before App Router / Server Action changes.
- Org data only via getScopedDb() in lib/db/scoped.ts.
- Match existing NoProjectState / Empty UI.

Current:
app/plan-holders/page.tsx uses NoProjectState / “No plan holders list yet.”
components/plan-holders/review-shell.tsx PENDING_COPY covers extracting / failed / none_found.

Change:
- No list: button “Upload a plan holders list” → /plan-holders/upload (preserve project query via withProjectQuery from lib/project-scope.ts if other plan-holder links do).
- Failed: “Retry from AI Processing” link to /processing plus “Upload again” to /plan-holders/upload.
- none_found: keep extractor notes (review.list.documentNotes).

Files: app/plan-holders/page.tsx, components/plan-holders/review-shell.tsx

Done when: empty and failed states have an obvious next click, not a dead end.
```

### Prompt 2.2

```
PROMPT 2.2 — Confirm remaining plan holders (one click, still flag low confidence)

Implement ONLY this item. Do not add CSV export or invites. Do not touch matchStatus / contractorId / registry.

House rules:
- Read node_modules/next/dist/docs/ before Server Actions.
- Org data via getScopedDb(). Validate listId with uuidSchema + parseInput from lib/validation.ts.
- listId must belong to current org: scoped findFirst first, throw if missing — same pattern as other plan-holder actions.
- LOW_CONFIDENCE = 90 (components/plan-holders/holder-row.tsx).

Current:
Only per-row Confirm via confirmPlanHolderAction. List status becomes confirmed only when every row is confirmed (refreshListStatus in app/plan-holders/actions.ts). There is no Confirm-all. review-shell.tsx only has Open source PDF besides per-row confirm.

Change:
1. New confirmRemainingPlanHoldersAction(listId) in app/plan-holders/actions.ts:
   - Load the list via scoped findFirst; throw if missing.
   - Load contacts for that list.
   - Set isConfirmed true, confirmedBy, confirmedAt on rows where isConfirmed === false.
   - Call existing refreshListStatus.
   - Return how many newly confirmed rows were under 90% confidence so the UI can toast: “N rows were under 90% confidence — spot-check those.”
2. Button on review-shell.tsx next to Open PDF: “Confirm remaining (N)”.
3. Disable when progress.confirmed === progress.total or pendingReason is set.

Files: app/plan-holders/actions.ts, components/plan-holders/review-shell.tsx

Done when: a 40-row list can be confirmed in one click; low-confidence rows still visually flagged on HolderRow.
```

### Prompt 2.3

```
PROMPT 2.3 — Export confirmed plan holders as CSV

Implement ONLY CSV export. No registry. No invites. No new API unless projectNumber/sourceLabel are missing from the shell.

House rules:
- Client-side download from already-loaded contacts (pattern: lib/comparison-export.ts).
- Org data via getScopedDb() if you must add a field to the page loader.

Change:
- New lib/plan-holder-export.ts with pure CSV builder.
- Columns: companyName, contactName, email, phone, licenseNumber, city, state, isConfirmed.
- Quote commas in company names (RFC-style CSV quoting).
- Filename: plan_holders_{projectNumber}_{sourceLabel}.csv — sanitize the label (no path separators).
- Default export confirmed only. Optional toggle confirmed / all is OK.
- If zero confirmed (and default is confirmed), disable button + tooltip “Confirm rows first.”
- Button on components/plan-holders/review-shell.tsx.

Test: one vitest — two contacts, only confirmed appears; commas quoted.

Done when: download opens in Excel with emails intact.
```

### Prompt 2.4

```
PROMPT 2.4 — Sidebar groups: Documents / Subcontractors / Bid

Implement ONLY sidebar grouping. Do not add routes.

House rules:
- Match existing SidebarGroup / SidebarGroupLabel usage in components/ui/sidebar.tsx and components/app-sidebar.tsx.
- Keep withProjectQuery from lib/project-scope.ts. Keep cost-setup dot, attention badge, review badge.

Current: components/app-sidebar.tsx mainNav is a flat list:
Dashboard, Projects, Upload Documents, Project Intelligence, Schedules & Tables, Cost Setup,
Upload Sub Quotes, Review Sub Quotes, Compare Quotes, Upload Plan Holders, Review Plan Holders,
Estimate Workspace, Bid Reconciliation, Human Review, Reports.
Footer already has Team/Billing/Settings/Help.

Change: split Contractor Workspace into three SidebarGroup sections:
1. Documents: Dashboard, Projects, Upload Documents, Project Intelligence, Schedules & Tables, Cost Setup
2. Subcontractors: Upload Sub Quotes, Review Sub Quotes, Compare Quotes, Upload Plan Holders, Review Plan Holders
3. Bid: Estimate Workspace, Bid Reconciliation, Human Review, Reports

Done when: a demo can say “this block is subs.”
```

### Prompt 2.5

```
PROMPT 2.5 — Quote compare: one-quote banner and “not who to list” disclaimer

Implement ONLY copy/banners on the compare grid. Do not add recommendations, registry, or ranking-as-legal-listing.

House rules: match existing unverifiedNotice / banner patterns in components/sub-quotes/comparison-grid.tsx.

Current:
app/sub-quotes/compare/page.tsx empty if no trades. One quote still renders one column.
components/sub-quotes/comparison-grid.tsx has ranking and unverifiedNotice — keep the unverified banner (countUnverified).

Change:
- If selected trade has columns.length < 2: banner “Need at least two quotes on this trade to level. Upload another under Upload Sub Quotes.” Still show the single quote (conditions are useful).
- Near adjusted-rank #1: “Cheapest after exclusions you costed — not a recommendation of who to list on the bid.”

Files: components/sub-quotes/comparison-grid.tsx (and app/sub-quotes/compare/page.tsx only if needed)

Done when: a two-quote demo shows the disclaimer on screen without the presenter saying it.
```

### Prompt 2.6

```
PROMPT 2.6 — Intelligence Overview: “Subs on this job” summary card

Implement ONLY a summary card. Do NOT invent recommended subs, DBE math, listing-threshold legal answers, or “list these companies.”

House rules:
- Org data via getScopedDb(). No new tables.
- Links via withProjectQuery from lib/project-scope.ts.

Place: Project Intelligence Overview (not the dashboard). Keep the dashboard light.

Data for current project:
- Plan holders: list count and confirmed contacts / total (app/plan-holders/actions.ts already has confirmedCount / holderCount on list summaries).
- Sub quotes: count by trade from listTradesForComparison in app/sub-quotes/actions.ts.

UI: card “Subcontractors” with two lines + links to /plan-holders and /sub-quotes/compare.

Files: app/intelligence/actions.ts (extend return type), components/intelligence/overview-tab.tsx, components/intelligence/intelligence-shell.tsx if props need threading.

Done when: Overview shows holder confirm progress and quote-by-trade counts with links, and no recommended-sub list.
```

---

## LIST 3 — Bid invites (PARKED)

**Do not paste these until the client unfreezes Lists 2–4.**

Do not reuse the team `invites` table or `inviteTeammateAction` (org seat invites via Supabase Auth). Do not build a sub portal, magic links, SMS, open/click tracking, or CSV/XLSX plan-holder upload.

Reuse `getResendClient()` and `EMAIL_FROM` from `lib/email/client.ts`. Pattern: `lib/email/review-request.ts`.

Paste order when unfrozen: **3.1 → 3.2 → 3.3 → 3.4 → 3.5**

### Prompt 3.1

```
PROMPT 3.1 — Schema + scoped db + analytics event for bid invites (no UI, no sending)

Implement ONLY the data layer. Do not send email. Do not add UI. Do not reuse the teammate invite table (db/schema.ts around the existing invites / inviteTeammateAction).

House rules:
- Read node_modules/next/dist/docs/ is not required unless you touch App Router; still follow DB rules.
- Org isolation: orgId, indexes, orgIsolationPolicy("bid_invite", table.orgId), .enableRLS().
- Follow plan_holder_contact comment style in db/schema.ts.
- Then pnpm db:generate. Read the generated SQL: ENABLE ROW LEVEL SECURITY + policy must be present. Then pnpm db:migrate.
- Wire lib/db/scoped.ts: import bidInvites, add bidInvites: orgScoped(...).
- Never import the raw Drizzle client from app code.

New enum bid_invite_status: sent | failed (no draft in v1).

New table bid_invite:
- id uuid pk defaultRandom
- orgId uuid not null FK org cascade
- projectId uuid not null FK project cascade
- planHolderContactId uuid null FK plan_holder_contact onDelete set null
- email text not null (snapshot at send time)
- companyName text not null (snapshot)
- trade text null
- message text null (optional custom note, max ~2000 at the action layer later)
- status enum sent/failed
- error text null
- sentAt timestamptz null
- sentBy uuid FK user set null
- createdAt / updatedAt timestamptz default now
Indexes: org_id, project_id, (project_id, email)

Analytics: add "bid_invites_sent" to AnalyticsEvent in lib/analytics.ts (properties will be projectId, sent, failed, skippedNoEmail).

Do not send email. Do not add UI.
```

### Prompt 3.2

```
PROMPT 3.2 — Resend helper for sub bid invites (no UI)

Implement ONLY lib/email/bid-invite.ts. Assume 3.1 schema exists. Do not send from the browser. Do not add the Server Action or UI yet.

House rules:
- server-only.
- Reuse getResendClient() and EMAIL_FROM from lib/email/client.ts.
- Pattern: lib/email/review-request.ts — but if Resend is missing, THROW a user-facing Error (the user clicked Send). Do not no-op like spend-cap alerts.

New file lib/email/bid-invite.ts:
- Input: { to, replyTo, projectName, projectNumber, owner, bidDate, trade, message, primeCompany }
- text body only (no HTML in v1)
- Subject: Bid invitation — {projectName} (#{projectNumber})
- Body: who is inviting, project, bid date, trade if any, custom message, then “Reply to this email with your quote. Do not click unknown links.”
- Return Resend id or throw

Add one line to .env.example: RESEND_API_KEY / EMAIL_FROM are also used for bid invites.
```

### Prompt 3.3

```
PROMPT 3.3 — sendBidInvitesAction (no UI)

Implement ONLY the server action. Assume 3.1 schema and 3.2 email helper exist. Do not add the dialog UI yet.

House rules:
- Read node_modules/next/dist/docs/ before Server Actions.
- Org data only via getScopedDb(). Validate with zod + parseInput from lib/validation.ts.
- Never send from the client. Never import the raw Drizzle client from app code.
- Do not reuse inviteTeammateAction / invites table.

New app/plan-holders/invite-actions.ts (do not bloat actions.ts unless necessary).

sendBidInvitesAction({ listId, contactIds: string[], trade?: string, message?: string }):
1. Zod: contactIds min 1 max 50; trade max 80; message max 2000.
2. Load list; assert it belongs to current org and list.projectId is the current project (or matches the project you resolve). Throw if missing.
3. Load contacts inArray(id, contactIds) AND planHolderListId = listId. Drop ids not in org.
4. Require isConfirmed. Unconfirmed → skippedUnconfirmed.
5. No email → skippedNoEmail.
6. For each eligible: send via lib/email/bid-invite.ts; insert bid_invite sent or failed. Do not abort the whole batch on one failure. Snapshot email and companyName at send time.
7. captureEvent("bid_invites_sent", { projectId, sent, failed, skippedNoEmail }).
8. Return { sent, failed, skippedNoEmail, skippedUnconfirmed }.

replyTo = signed-in user’s email. Sequential Resend calls OK (max 50).
```

### Prompt 3.4

```
PROMPT 3.4 — Plan holders UI: select, send invite dialog, sent log

Implement ONLY UI on Review Plan Holders. Assume 3.1–3.3 exist. No sub portal, magic links, or SMS.

House rules:
- Match existing review-shell / holder-row patterns. Use Dialog, Button, Checkbox from components/ui/.
- Org data via getScopedDb() in any new loader. Validate with zod + parseInput.

components/plan-holders/holder-row.tsx:
- Checkbox enabled only if email present AND isConfirmed.
- If no email: disabled + title “No email on the roster.”

components/plan-holders/review-shell.tsx:
- Selected ids in parent (or a small client wrapper).
- Sticky bar: “N selected” + “Send bid invite…”
- Dialog: optional trade, message textarea, list of recipient emails, warning for skipped rows.
- Submit sendBidInvitesAction → toast like “Sent 12, 1 failed, 3 had no email” → router.refresh().

Sent log: table of this project’s bid_invite rows newest first: company, email, trade, status, time, error.
Load via listBidInvitesForProject(projectId) from app/plan-holders/page.tsx.

Done when: confirm a holder with email → send → row status sent (or failed with error).
```

### Prompt 3.5

```
PROMPT 3.5 — Unit tests for bid-invite recipient partitioning

Implement ONLY tests + a pure helper if it is not already extracted. Do not mock Resend. Do not add e2e.

Put partitionInvitees(contacts, selectedIds) in lib/bid-invite.ts (not the email sender). Cases:
- skip unconfirmed
- skip no email
- include confirmed with email

Run the new vitest file (e.g. lib/bid-invite.test.ts).

Done when tests are green.
```

---

## LIST 4 — Spec checklist, not bid/no-bid (PARKED)

**Do not paste these until the client unfreezes Lists 2–4.**

Never add a Bid / Pass score. Never invent typical agency percentages. Never say “bid this.” `listing_threshold` is the printed rule, not legal advice.

Paste order when unfrozen: **4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6**

### Prompt 4.1

```
PROMPT 4.1 — select-spec-pages: include bid-requirement language, not only DBE

Implement ONLY page selection + tests. Do not change the Claude tools yet. Do not add Intelligence UI.

Files: worker/src/select-spec-pages.ts, worker/src/select-spec-pages.test.ts (run from the worker package).

Current: GOAL_TERMS, LINK_TERMS, hasNoGoalLanguage skips Claude if no goal terms. After this change, no DBE language must NOT skip the job if bid-requirement terms exist.

Add REQUIREMENT_TERMS such as: bid bond, proposal guarantee, bidder's bond, liquidated damage, working day, calendar day, prevailing wage, dir, contractor's license, class a, listing, public contract code, 4104, subcontractor list, engineer's estimate, engineers estimate, bid opening, bid date, must be received.

Scoring: include pages that hit requirement terms even with 0 goal hits. Raise MAX_SELECTED_PAGES only if tests show the bond clause is dropped (try 32 before 48).

Rename/clarify hasNoGoalLanguage → hasNoExtractableLanguage = no goal AND no requirement AND no link terms. Update callers in worker/src/extract-participation-goals.ts that skip Claude.

Done when: a fixture page with only “liquidated damages of $2,500 per calendar day” is selected; a Standard Specs boilerplate page is not.
```

### Prompt 4.2

```
PROMPT 4.2 — Types for ExtractedBidRequirement (worker + app, keep in sync)

Implement ONLY types. No extractor prompt changes yet. No UI.

There is no shared package. Hand-copy the same type to worker/src/types.ts AND lib/cost-engine/types.ts.

export type ExtractedBidRequirement = {
  key:
    | "bid_date"
    | "engineers_estimate"
    | "license_class"
    | "bid_bond_percent"
    | "listing_threshold"
    | "working_days"
    | "liquidated_damages"
    | "prevailing_wage"
    | "other"
  rawText: string
  value?: string          // as printed, not normalized to a Date unless obvious
  confidence?: number
  sourcePage?: number
  notes?: string
}

Add bidRequirements?: ExtractedBidRequirement[] on TakeoffResult in both places.

Keep participationGoals and specLinks as they are. Also mirror on db/schema.ts takeoff_job.result comment/type if it duplicates TakeoffResult.

listing_threshold is a printed % or dollar rule, not legal advice — types only in this task.
```

### Prompt 4.3

```
PROMPT 4.3 — Spec extractor: record_bid_requirements on the same selected pages

Implement the worker extraction. Assume 4.1 page selection and 4.2 types exist. Do not add Intelligence UI yet. Do not run a second full-PDF job.

Preferred: extend worker/src/extract-participation-goals.ts.
1. Keep record_participation_goals.
2. Add tool record_bid_requirements for the checklist fields.
3. Two sequential messages.create calls on the SAME selected pages is OK for v1 (simpler parse; ~2× cost is acceptable).

Prompt rules (copy the goals extractor’s anti-hallucination):
- Only what is printed. Empty array if excerpt has no such clause.
- Never fill “typical 10% bid bond.”
- rawText verbatim.
- listing_threshold is the printed rule, not legal advice.
- If not a specs document: empty arrays + documentNotes.

worker/src/process-job.ts specifications branch: attach bidRequirements on result.
itemCount: goals.length + requirements.length is fine.
If a second API call: usage kind spec_requirements_extraction and recordAiUsage; price table in worker/src/ai-limits.ts must include TAKEOFF_MODEL.

Do not add a Bid / Pass verdict anywhere.
```

### Prompt 4.4

```
PROMPT 4.4 — Intelligence Bid Requirements tab: show extracted checklist

Implement ONLY the app UI/read path. Assume worker writes bidRequirements on takeoff_job.result.

House rules:
- Org data via getScopedDb().
- Run spec URLs through safeSpecUrl if you show links (already done for specLinks).
- Do NOT add a Bid / Pass button or score.

Current: components/intelligence/bid-requirements-tab.tsx shows project-create fields and explicitly says listing / bonds / licenses are not extracted. Replace that honesty footer with confirm-against-specs language, not “we extract nothing.”

app/intelligence/actions.ts:
- BidRequirementView: key, label, value, rawText, notes, documentName, sourcePage, confidence.
- Map job.result.bidRequirements like participationGoals.
- Thread through IntelligenceShell to BidRequirementsTab.

components/intelligence/bid-requirements-tab.tsx:
- Table: Requirement | Extracted value | Source (reuse SourceChip).
- Under each row, muted verbatim rawText.
- If a field is missing from extraction, fall back to project fields ONLY for: bid date, working days, LDs, prevailing wage, engineer’s estimate. Label: “From project setup, not the specs.”
- Replace the footer that says listing/bonds aren’t extracted with: “Confirm against the specs. Constimator does not decide bid/no-bid.”
- Confidence < 90: warning badge.

Done when: printed clauses show with quote + page, and the product never says “bid this.”
```

### Prompt 4.5

```
PROMPT 4.5 — Spec checklist tests (and optional real-job note)

1. worker/src/select-spec-pages.test.ts: requirement-only page selected; TOC-only “see section 2 for bonds” should not outrank a real clause page.
2. If you added a mapper for record_bid_requirements, unit-test it (no live Claude).
3. If env/worker/docs are available, run one Notice to Bidders or Special Provisions:
   node --env-file=.env.local scripts/real-job/upload.ts <pdf> --type specifications
   Then report bond %, listing, LDs, PW, goal vs the PDF by hand.

Do not implement a bid/no-bid verdict. Do not invent typical percentages.

Run worker tests from the worker package.
```

### Prompt 4.6

```
PROMPT 4.6 — Honesty copy: checklist, not “AI tells you whether to bid”

Implement ONLY copy / keep demo RFI gated. No new extraction. No score.

1. components/intelligence/risks-tab.tsx: keep real projects on “Risk detection isn’t available yet.” Do not enable Shasta RFIs for other jobs (project.number === demoProject.number stays).
2. components/features.tsx: say Constimator reads DBE/DVBE and a bid/no-bid checklist (bond, license, listing, time, LDs) from the specs — you confirm. It does not tell you whether to bid.

Done when: marketing cannot be read as a bid/no-bid engine.
```

---

## Order to paste

**Now (client freeze):**

1.1 → 1.2 → 1.3 → 1.4 → 1.6 → 1.7 → 1.5 → 1.8

**After the client unfreezes, and only the list they pick from demo repeats:**

- List 2: 2.1 → 2.2 → 2.3 → 2.5 → 2.4 → 2.6
- List 3: 3.1 → 3.2 → 3.3 → 3.4 → 3.5
- List 4: 4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6
