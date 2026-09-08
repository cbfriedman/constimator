# Cursor prompts — one chat per item

Copy everything inside each `PROMPT` block into a **new** Cursor chat. Do them in order. Do not paste two into one chat.

Shared rules are already inside every prompt so each one stands alone.

---

## LIST 1 — Bid-form auto-fill

### Prompt 1.1

```
PROMPT 1.1 — Reconciliation empty state: push import, not typing

Implement ONLY this item. Do not start 1.2 or other lists.

House rules:
- Read node_modules/next/dist/docs/ before changing App Router / Server Actions.
- Org data only through getScopedDb() in lib/db/scoped.ts. Never import the raw Drizzle client from app code.
- Match existing UI patterns. No unrelated refactors.

Context:
Bid-form AI extraction and import already exist (BidFormImportCard, importExtractedBidFormAction, pendingBidFormExtractions). If the uploaded file is not typed Official Bid Form (bid_form), the worker runs plan takeoff and import will not appear.

Current problem:
components/reconciliation/reconciliation-shell.tsx (~lines 151–171): when pendingExtractions.length > 0, the import card shows, THEN the empty state still says “Enter the official bid form’s line items below.” That tells people to type even when extraction is ready.

Change:
1. If pendingExtractions.length > 0 AND !hasBidForm:
   - Empty title: “Extracted bid form ready to import”
   - Description: “Review the table, then import. You can edit any row after.”
   - Do NOT use “Enter line items” as the primary message.
2. If no pending extraction AND no bid form:
   - Title: “No official bid form yet”
   - Description: “Upload the official bid form under Upload Documents (type Official Bid Form). When extraction finishes, import it here. Typing rows is only a fallback.”
   - Button: router.push(`/upload?project=${projectId}`) labeled “Upload bid form”.
3. Keep BidLineTable below as fallback in both cases.

Files: components/reconciliation/reconciliation-shell.tsx

Done when: with a completed bid-form job and zero bid rows, the first thing you see is the import card, not “type it in.”

Do not auto-import without a confirm click. Do not change the extractor.
```

### Prompt 1.2

```
PROMPT 1.2 — Import preview: confidence, notes, page, skip rows

Implement ONLY this item. Assume 1.1 is done or ignore it. Do not start 1.3.

House rules:
- Read node_modules/next/dist/docs/ before App Router / Server Action changes.
- Org data only via getScopedDb(). Validate actions with zod + parseInput from lib/validation.ts.
- Match existing UI (warning color text-warning). LOW_CONFIDENCE = 90 like components/plan-holders/holder-row.tsx.

Current:
components/reconciliation/bid-form-import-card.tsx shows #, Description, Unit, Qty only and always imports extraction.items in full. extractedBidItemSchema already has confidence, sourcePage, notes. bid.extraction_confidence is stored on import.

Change:
1. In lib/bid-form-import.ts add filterSkipped(items, skippedKeys) so filtering is not only in React. Key = `${itemNumber}::${description}` (if collision, use index).
2. In bid-form-import-card.tsx:
   - Local state skippedItemKeys: Set<string>
   - Columns: # | Description | Unit | Qty | Conf | Notes. Show p.{sourcePage} under description when present.
   - Confidence: null → “—”; < 90 → text-warning; >= 90 → muted tabular.
   - Checkbox/Skip per row. Skipped rows excluded from importExtractedBidFormAction payload.
   - Button: “Import N items”. Disable if N === 0.
3. importExtractedBidFormAction already takes items — send the filtered list. Optionally add skippedCount to bid_form_imported analytics in app/reconciliation/actions.ts.

Tests in lib/bid-form-import.test.ts: all selected; one skipped; all skipped returns [].

Done when: an 88-confidence row is visually flagged; unchecking it means it is not in bid after import.

Do not add per-cell edit in the preview. Edit after import already exists.
```

### Prompt 1.3

```
PROMPT 1.3 — Show extraction confidence on the official bid-line table

Implement ONLY this item.

House rules: getScopedDb only; no schema migration (column already exists).

Current:
components/reconciliation/bid-line-table.tsx has no confidence column. openEdit does not pass extractionConfidence. Schema already has bids.extractionConfidence in db/schema.ts (~line 735).

Change:
- Add a narrow “AI conf” column after Qty.
- Same < 90 warning styling as the import card (text-warning).
- Manual rows (documentId null, confidence null) show “—”.
- Do NOT add a notes column to bid. Confidence-only.

Files: components/reconciliation/bid-line-table.tsx

Done when: imported rows show 94 / 88 / etc.; typed rows show —.
```

### Prompt 1.4

```
PROMPT 1.4 — Optional “seed estimate from this schedule” after bid-form import

Implement ONLY this item.

House rules: Server Actions via existing importFromBidScheduleAction. Org data via getScopedDb.

Current:
Estimate Workspace already has “Import from Bid Schedule” in components/estimate/estimate-shell.tsx calling importFromBidScheduleAction in app/estimate/actions.ts. It creates estimate lines with source: "official", qty = official qty, unitPrice: "0". Skips bids already linked by bidId or unique description match.

Change:
After successful import in components/reconciliation/bid-form-import-card.tsx, show a secondary button: “Create estimate lines from this schedule”.
- Call importFromBidScheduleAction(projectId).
- Toast: “Added N estimate lines at $0 — price them in Estimate Workspace.”
- If added === 0: “Estimate already has those items.”
- Do NOT auto-seed without a click.

Done when: Import → click seed → /estimate has one line per bid item at $0, linked by bidId.
```

### Prompt 1.5

```
PROMPT 1.5 — Processing page next-step when bid form is extracted

Implement ONLY this item. Do not change e2e fixture types.

House rules: Read node_modules/next/dist/docs/ if you touch the processing page. Org data via getScopedDb.

Current:
If a document is not typed bid_form, worker/src/process-job.ts runs plan takeoff, not bid-form transcription. Upload checklist already includes Official Bid Form (components/upload/upload-shell.tsx). Keep the existing warning if they continue without marking a bid form.

Change:
After processing completes, if a bid_form job is complete, add a one-line on /processing: “Bid form extracted — open Bid Reconciliation to import.” Link to /reconciliation (preserve project query if the app uses withProjectQuery / current project).

Files: components/processing/processing-shell.tsx, and app/processing/actions.ts only if you need kind on the job result (it likely already has it).

Done when: a correctly typed bid-form PDF ends with a clear next step to /reconciliation.
```

### Prompt 1.6

```
PROMPT 1.6 — Marketing and pilot copy: upload/import is the primary path

Implement ONLY copy changes. No feature work.

Current:
components/how-it-works.tsx step 01 is “Enter the official bid form” item by item; comments say there is no upload-and-auto-fill. docs/PILOT_CHECKLIST.md step 5 still leads with typing. FAQ in components/faq.tsx says you enter line items directly.

Change:
1. How it works 01: “Upload the official bid form. Constimator reads the schedule; you confirm and import. Typing is only if you have no PDF.”
2. FAQ “What documents does it need?”: official bid form is uploaded and imported, not only typed.
3. Pilot step 5: import after review is primary; typing is fallback.

Files: components/how-it-works.tsx, components/faq.tsx, docs/PILOT_CHECKLIST.md

Done when: a contractor reading the site is not told to retype 80 lines.
```

### Prompt 1.7

```
PROMPT 1.7 — Unit tests for pendingBidFormExtractions and bidRowsFromExtractedItems

Implement ONLY tests (and tiny helper fixes if a test proves a bug in existing mapping). Do not build new UI.

File: lib/bid-form-import.test.ts (extend). Logic under test: lib/bid-form-import.ts

Current tests: pending job returned; skip if documentId already on a bid; ignore plan_takeoff; map fields including confidence.

Add:
- Latest job wins if two jobs exist for one document (sort by createdAt desc).
- Failed / queued jobs ignored.
- Empty bidItems → not pending.
- Invalid item (missing description) → whole parse fails, document not pending. Do not silently drop rows.
- bidRowsFromExtractedItems: missing confidence → extractionConfidence: null.
- If filterSkipped exists from 1.2, keep those cases.

Run: pnpm test lib/bid-form-import.test.ts
```

### Prompt 1.8

```
PROMPT 1.8 — Validate bid-form extraction on real PDFs (do not add product features)

This is a validation pass, not a new feature. Follow scripts/real-job/README.md.

Steps:
1. Ensure worker is running: cd worker && npm run dev
2. For at least 3 real civil/DOT/county bid-form PDFs (clean digital), upload as type bid_form:
   node --env-file=.env.local scripts/real-job/upload.ts ./scripts/real-job/pdfs/<file>.pdf --type bid_form
3. Key expected CSV under scripts/real-job/expected/ (gitignored).
4. Compare:
   node --env-file=.env.local scripts/real-job/compare.ts --document <id> --expected ./scripts/real-job/expected/<name>.csv
5. Record: row count, MISSING, EXTRA, QTY, UNIT, mean confidence on ok vs wrong.

If long schedules truncate: raise max_tokens in worker/src/extract-bid-form.ts (currently 16000) and re-run. Do NOT add silent auto-import.
If the file was uploaded as Plans/Other: re-upload as Official Bid Form. Do not feed takeoff items into bid.

Write a short notes file only if I ask; otherwise summarize results in the chat.

Done when: 3 packages are importable in principle, and wrong rows are low-confidence or noted.
```

---

## LIST 2 — Who to list (demo)

Do not build CSLB/DIR/DBE registry, contractor matching, or “list these companies.”

### Prompt 2.1

```
PROMPT 2.1 — Plan holders empty / pending copy and next actions

Implement ONLY this item. Do not add Confirm remaining, CSV export, or invites.

House rules: getScopedDb(); match existing NoProjectState / empty UI.

Current:
app/plan-holders/page.tsx uses NoProjectState / “No plan holders list yet.”
components/plan-holders/review-shell.tsx PENDING_COPY covers extracting / failed / none_found.

Change:
- No list: button “Upload a plan holders list” → /plan-holders/upload.
- Failed: “Retry from AI Processing” link to /processing plus “Upload again” to /plan-holders/upload.
- none_found: keep extractor notes (review.list.documentNotes).

Files: app/plan-holders/page.tsx, components/plan-holders/review-shell.tsx
```

### Prompt 2.2

```
PROMPT 2.2 — Confirm remaining plan holders (one click, still flag low confidence)

Implement ONLY this item.

House rules:
- Org data via getScopedDb(). Validate listId with uuidSchema + parseInput.
- listId must belong to current org: scoped findFirst first, throw if missing.
- LOW_CONFIDENCE = 90 (holder-row.tsx).

Current:
Only per-row Confirm via confirmPlanHolderAction. List status becomes confirmed only when every row is confirmed (refreshListStatus in app/plan-holders/actions.ts). No Confirm-all.

Change:
1. New confirmRemainingPlanHoldersAction(listId):
   - Load contacts for that list.
   - Set isConfirmed true, confirmedBy, confirmedAt on rows where isConfirmed === false.
   - Call existing refreshListStatus.
   - Return how many were under 90% confidence so the UI can toast: “N rows were under 90% confidence — spot-check those.”
2. Button on review-shell.tsx next to Open PDF: “Confirm remaining (N)”.
3. Disable when progress.confirmed === progress.total or pendingReason is set.

Files: app/plan-holders/actions.ts, components/plan-holders/review-shell.tsx

Done when: a 40-row list can be confirmed in one click; low-confidence rows still visually flagged on HolderRow.

Do not touch matchStatus / contractorId / registry.
```

### Prompt 2.3

```
PROMPT 2.3 — Export confirmed plan holders as CSV

Implement ONLY CSV export. No registry. No invites.

Pattern: lib/comparison-export.ts (client-side file download).

Change:
- New lib/plan-holder-export.ts with pure CSV builder.
- Columns: companyName, contactName, email, phone, licenseNumber, city, state, isConfirmed.
- Quote commas in company names.
- Filename: plan_holders_{projectNumber}_{sourceLabel}.csv — sanitize the label.
- Default export confirmed only. Optional toggle confirmed / all is OK.
- If zero confirmed (and default is confirmed), disable button + tooltip “Confirm rows first.”
- Button on components/plan-holders/review-shell.tsx using already-loaded contacts (no new API unless projectNumber/sourceLabel are missing from the shell).

Test: one vitest — two contacts, only confirmed appears; commas quoted.

Done when: download opens in Excel with emails intact.
```

### Prompt 2.4

```
PROMPT 2.4 — Sidebar groups: Documents / Subcontractors / Bid

Implement ONLY sidebar grouping. Do not add routes.

Current: components/app-sidebar.tsx mainNav is a flat list. Footer already has Team/Billing/Settings/Help.

Change: split Contractor Workspace into three SidebarGroup sections (SidebarGroupLabel already exists):
1. Documents: Dashboard, Projects, Upload Documents, Project Intelligence, Schedules & Tables, Cost Setup
2. Subcontractors: Upload Sub Quotes, Review Sub Quotes, Compare Quotes, Upload Plan Holders, Review Plan Holders
3. Bid: Estimate Workspace, Bid Reconciliation, Human Review, Reports

Keep existing badges (cost setup dot, attention, review). Keep withProjectQuery / project switcher behavior.

Done when: a demo can say “this block is subs.”
```

### Prompt 2.5

```
PROMPT 2.5 — Quote compare: one-quote banner and “not who to list” disclaimer

Implement ONLY copy/banners on the compare grid. Do not add recommendations.

Current:
app/sub-quotes/compare/page.tsx empty if no trades. One quote still renders one column.
components/sub-quotes/comparison-grid.tsx has ranking and unverifiedNotice — keep unverified banner.

Change:
- If selected trade has columns.length < 2: banner “Need at least two quotes on this trade to level. Upload another under Upload Sub Quotes.” Still show the single quote.
- Near adjusted-rank #1: “Cheapest after exclusions you costed — not a recommendation of who to list on the bid.”

Files: components/sub-quotes/comparison-grid.tsx (and compare/page.tsx only if needed)

Done when: two-quote demo shows the disclaimer on screen without the presenter saying it.
```

### Prompt 2.6

```
PROMPT 2.6 — Intelligence Overview: “Subs on this job” summary card

Implement ONLY a summary card. Do NOT invent recommended subs, DBE math, or listing advice.

Place: Project Intelligence Overview (not dashboard).

Data for current project:
- Plan holders: list count and confirmed contacts / total (app/plan-holders/actions.ts already has confirmedCount / holderCount on list summaries).
- Sub quotes: count by trade from listTradesForComparison in app/sub-quotes/actions.ts.

UI: card “Subcontractors” with two lines + links to /plan-holders and /sub-quotes/compare (preserve project query if used).

Files: app/intelligence/actions.ts (extend return type), components/intelligence/overview-tab.tsx, components/intelligence/intelligence-shell.tsx if props need threading.

House rules: getScopedDb(); no new tables.
```

---

## LIST 3 — Bid invites

Do not reuse the team `invite` table or inviteTeammateAction. Do not build a sub portal, SMS, or CSV plan-holder upload.

### Prompt 3.1

```
PROMPT 3.1 — Schema + scoped db + analytics event for bid invites (no UI, no sending)

Implement ONLY data layer.

House rules:
- Org isolation: orgId, indexes, orgIsolationPolicy("bid_invite", table.orgId), .enableRLS().
- Follow plan_holder_contact comment style in db/schema.ts.
- Then pnpm db:generate. Read the SQL: ENABLE ROW LEVEL SECURITY + policy must be present. Then pnpm db:migrate.
- Wire lib/db/scoped.ts: import bidInvites, bidInvites: orgScoped(...).
- Never import raw Drizzle client from app code.

New enum bid_invite_status: sent | failed (no draft).

New table bid_invite:
- id uuid pk defaultRandom
- orgId uuid not null FK org cascade
- projectId uuid not null FK project cascade
- planHolderContactId uuid null FK plan_holder_contact onDelete set null
- email text not null (snapshot)
- companyName text not null (snapshot)
- trade text null
- message text null
- status enum sent/failed
- error text null
- sentAt timestamptz null
- sentBy uuid FK user set null
- createdAt / updatedAt timestamptz default now
Indexes: org_id, project_id, (project_id, email)

Analytics: add "bid_invites_sent" to AnalyticsEvent in lib/analytics.ts (properties will be projectId, sent, failed, skippedNoEmail — you can add the union member now).

Do not send email. Do not add UI.
```

### Prompt 3.2

```
PROMPT 3.2 — Resend helper for sub bid invites (no UI)

Implement ONLY lib/email/bid-invite.ts. Assume 3.1 schema exists. Do not send from the browser.

Reuse getResendClient() and EMAIL_FROM from lib/email/client.ts. Pattern: lib/email/review-request.ts — but if Resend is missing, THROW a user-facing Error (the user clicked Send). Do not no-op like spend-cap alerts.

New file lib/email/bid-invite.ts (server-only):
- Input: { to, replyTo, projectName, projectNumber, owner, bidDate, trade, message, primeCompany }
- text body only
- Subject: Bid invitation — {projectName} (#{projectNumber})
- Body: who is inviting, project, bid date, trade if any, custom message, then “Reply to this email with your quote. Do not click unknown links.”
- Return Resend id or throw

Add one line to .env.example: RESEND_API_KEY / EMAIL_FROM also used for bid invites.

Do not add the Server Action or UI yet.
```

### Prompt 3.3

```
PROMPT 3.3 — sendBidInvitesAction (no UI)

Implement ONLY the server action. Assume 3.1 schema and 3.2 email helper exist.

House rules: getScopedDb(); zod + parseInput; never send from the client.

New app/plan-holders/invite-actions.ts (do not bloat actions.ts unless necessary).

sendBidInvitesAction({ listId, contactIds: string[], trade?: string, message?: string }):
1. Zod: contactIds min 1 max 50; trade max 80; message max 2000.
2. Load list; assert it belongs to current org and current project (or list.projectId matches the project you resolve).
3. Load contacts inArray(id, contactIds) AND planHolderListId = listId. Drop ids not in org.
4. Require isConfirmed. Unconfirmed → skippedUnconfirmed.
5. No email → skippedNoEmail.
6. For each eligible: send via lib/email/bid-invite.ts; insert bid_invite sent or failed. Do not abort the whole batch on one failure. Snapshot email and companyName.
7. captureEvent("bid_invites_sent", { projectId, sent, failed, skippedNoEmail }).
8. Return { sent, failed, skippedNoEmail, skippedUnconfirmed }.

replyTo = signed-in user’s email. Sequential Resend calls OK (max 50).
```

### Prompt 3.4

```
PROMPT 3.4 — Plan holders UI: select, send invite dialog, sent log

Implement ONLY UI on Review Plan Holders. Assume 3.1–3.3 exist.

components/plan-holders/holder-row.tsx:
- Checkbox enabled only if email present AND isConfirmed.
- If no email: disabled + title “No email on the roster.”

components/plan-holders/review-shell.tsx:
- Selected ids in parent (or wrapper).
- Sticky bar: “N selected” + “Send bid invite…”
- Dialog: optional trade, message textarea, list of recipient emails, warning for skipped rows.
- Submit sendBidInvitesAction → toast like “Sent 12, 1 failed, 3 had no email” → router.refresh().

Sent log: table of this project’s bid_invite rows newest first: company, email, trade, status, time, error.
Load via listBidInvitesForProject(projectId) from app/plan-holders/page.tsx.

Done when: confirm a holder with email → send → row status sent (or failed with error). No sub portal.
```

### Prompt 3.5

```
PROMPT 3.5 — Unit tests for bid-invite recipient partitioning

Implement ONLY tests + a pure helper if it is not already extracted.

Put partitionInvitees(contacts, selectedIds) in lib/bid-invite.ts (not the email sender). Cases: skip unconfirmed; skip no email; include confirmed with email.

Do not mock Resend. Do not add e2e.

Run the new vitest file.
```

---

## LIST 4 — Spec checklist (not bid/no-bid)

Never add a Bid / Pass score. Never invent typical agency percentages.

### Prompt 4.1

```
PROMPT 4.1 — select-spec-pages: include bid-requirement language, not only DBE

Implement ONLY page selection + tests. Do not change the Claude tools yet.

Files: worker/src/select-spec-pages.ts, worker/src/select-spec-pages.test.ts (run from worker package).

Current: GOAL_TERMS, LINK_TERMS, hasNoGoalLanguage skips Claude if no goal terms. After this change, no DBE language must NOT skip the job if bid-requirement terms exist.

Add REQUIREMENT_TERMS such as: bid bond, proposal guarantee, bidder's bond, liquidated damage, working day, calendar day, prevailing wage, dir, contractor's license, class a, listing, public contract code, 4104, subcontractor list, engineer's estimate, engineers estimate, bid opening, bid date, must be received.

Scoring: include pages that hit requirement terms even with 0 goal hits. Raise MAX_SELECTED_PAGES only if tests show the bond clause is dropped (try 32 before 48).

Rename/clarify hasNoGoalLanguage → hasNoExtractableLanguage = no goal AND no requirement AND no link terms. Update callers in worker/src/extract-participation-goals.ts that skip Claude.

Done when: a fixture page with only “liquidated damages of $2,500 per calendar day” is selected; a Standard Specs boilerplate page is not.
```

### Prompt 4.2

```
PROMPT 4.2 — Types for ExtractedBidRequirement (worker + app, keep in sync)

Implement ONLY types. No extractor prompt changes yet.

Add the same type to worker/src/types.ts AND lib/cost-engine/types.ts (hand-copy; no shared package):

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
  value?: string
  confidence?: number
  sourcePage?: number
  notes?: string
}

Add bidRequirements?: ExtractedBidRequirement[] on TakeoffResult in both places.

Keep participationGoals and specLinks as they are. Also mirror on db/schema.ts takeoff_job.result comment/type if it duplicates TakeoffResult.
```

### Prompt 4.3

```
PROMPT 4.3 — Spec extractor: record_bid_requirements on the same selected pages

Implement the worker extraction. Assume 4.1 page selection and 4.2 types exist.

Preferred: extend worker/src/extract-participation-goals.ts (do not run a second full-PDF job).
1. Keep record_participation_goals.
2. Add tool record_bid_requirements for the checklist fields.
3. Two sequential messages.create calls on the SAME selected pages is OK for v1 (simpler parse).

Prompt rules (same anti-hallucination as goals):
- Only what is printed. Empty array if excerpt has no such clause.
- Never fill “typical 10% bid bond.”
- rawText verbatim.
- listing_threshold is the printed rule, not legal advice.
- If not a specs document: empty arrays + documentNotes.

worker/src/process-job.ts specifications branch: attach bidRequirements on result.
itemCount: goals.length + requirements.length is fine.
If a second API call: usage kind spec_requirements_extraction and recordAiUsage; price table in worker/src/ai-limits.ts must include TAKEOFF_MODEL.

Do not add Intelligence UI yet.
```

### Prompt 4.4

```
PROMPT 4.4 — Intelligence Bid Requirements tab: show extracted checklist

Implement ONLY the app UI/read path. Assume worker writes bidRequirements on takeoff_job.result.

House rules: getScopedDb(); run spec URLs through safeSpecUrl if you show links (already done for specLinks).

app/intelligence/actions.ts:
- BidRequirementView: key, label, value, rawText, notes, documentName, sourcePage, confidence.
- Map job.result.bidRequirements like participationGoals.
- Thread through IntelligenceShell to BidRequirementsTab.

components/intelligence/bid-requirements-tab.tsx:
- Table: Requirement | Extracted value | Source (SourceChip).
- Under each row, muted verbatim rawText.
- If a field is missing, fall back to project fields ONLY for: bid date, working days, LDs, prevailing wage, engineer’s estimate. Label: “From project setup, not the specs.”
- Replace the footer that says listing/bonds aren’t extracted with: “Confirm against the specs. Constimator does not decide bid/no-bid.”
- Confidence < 90: warning badge.

Do NOT add a Bid / Pass button or score.
```

### Prompt 4.5

```
PROMPT 4.5 — Spec checklist tests (and optional real-job note)

1. worker/src/select-spec-pages.test.ts: requirement-only page selected; TOC-only “see section 2 for bonds” should not outrank a real clause page.
2. If you added a mapper for record_bid_requirements, unit-test it (no live Claude).
3. If env/worker/docs are available, run one Notice to Bidders or Special Provisions:
   node --env-file=.env.local scripts/real-job/upload.ts <pdf> --type specifications
   Then report bond %, listing, LDs, PW, goal vs the PDF by hand.

Do not implement a bid/no-bid verdict.
```

### Prompt 4.6

```
PROMPT 4.6 — Honesty copy: checklist, not “AI tells you whether to bid”

Implement ONLY copy / keep demo RFI gated.

1. components/intelligence/risks-tab.tsx: keep real projects on “Risk detection isn’t available yet.” Do not enable Shasta RFIs for other jobs (project.number === demoProject.number stays).
2. components/features.tsx: say Constimator reads DBE/DVBE and a bid/no-bid checklist (bond, license, listing, time, LDs) from the specs — you confirm. It does not tell you whether to bid.

No new extraction. No score.
```

---

## Order to paste

1.1 → 1.2 → 1.3 → 1.4 → 1.6 → 1.7 → 1.5 → 1.8  
2.1 → 2.2 → 2.3 → 2.5 → 2.4 → 2.6  
3.1 → 3.2 → 3.3 → 3.4 → 3.5  
4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6
