# Real-job harness (standalone — not part of the app)

Runs one of your actual bid documents through the real pipeline and prints
what the AI extracted next to what you know is correct.

This exists to answer the only question Phase 1 rests on: **does extraction
off a real bid form hold up on a job you can hand-check?** Everything else in
the product assumes the answer is yes.

Unlike `scripts/takeoff-validation/` (a standalone feasibility probe that
never touches the app), this one drives the **real** path — Supabase Storage,
the `document` row, the `takeoff_job` queue, the worker, the same prompt and
model that production uses. The only thing it skips is the browser.

## Setup

No install step — both scripts use the app's own `postgres` dependency and
run on Node's native TypeScript support (Node 22.18+ / 24+).

They need `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`), and
`SUPABASE_SERVICE_ROLE_KEY`, all of which are already in `.env.local` — hence
`--env-file=.env.local` on every command below.

A worker must be running to process the job:

```sh
cd worker && npm run dev
```

If the Railway worker is deployed against the same database, it may claim the
job first. That's harmless — it's the same code — but stop it if you want to
watch the extraction happen in your own terminal.

## 1. Upload and process

```sh
node --env-file=.env.local scripts/real-job/upload.ts ./scripts/real-job/pdfs/shasta-bid-form.pdf \
  --org coby-88b3c0f1 --project 24-118 --type bid_form
```

Uploads, queues, and waits for the job to finish, then prints the document id.
`--org`/`--project` can be omitted when there's only one of each. `--type`
defaults to `bid_form`; pass `--type plans` to exercise the plan-sheet takeoff
path instead, or `--type specifications` for the participation-goal reader.

### Plan holders lists and plan room exports

```sh
node --env-file=.env.local scripts/real-job/upload.ts ./scripts/real-job/pdfs/ops-export.pdf \
  --type plan_holders --label "Online Plan Service export, 3/14"
```

`--label` is required and has no default, matching the app's own upload: a
roster gets reissued as more bidders pull documents, and the label is the only
thing telling one issue from the next. The run creates the `plan_holder_list`
row too, so the result is reviewable at `/plan-holders` rather than only
visible in `takeoff_job.result`.

Instead of pointing at `compare.ts` — a roster has no bid items to compare —
this prints the first few parsed companies beside their verbatim source lines,
which is what a reader test actually needs to judge.

**It must be a PDF.** Not a harness limitation: `lib/document-upload.ts`
restricts plan holder lists to `application/pdf`, and the extractor sends the
file to Claude as a PDF document block. Plan services export rosters as CSV or
XLSX at least as often, and those are rejected before the reader sees them —
so when asking a plan room member for an export, ask for the PDF or print-to-PDF
version. A spreadsheet export needs a non-vision code path that doesn't exist
yet.

### No document handy?

`node scripts/real-job/make-sample.mjs` writes a synthetic Caltrans-style bid
schedule to `pdfs/` plus its answer key to `expected/`. It exercises the
things transcription actually trips on — a quoted inch mark, wrapped
descriptions, thousands separators, a dashed lump-sum quantity, an additive
alternate, and empty bidder-priced columns the extractor is told to ignore.

It proves the pipeline runs; it proves nothing about accuracy on a real
agency's form, since the answer key comes from the same source that drew the
PDF. Use it to shake out plumbing, not to decide anything.

## 2. Write down the right answer

A CSV of what's actually on the form. Headers are matched loosely
(`item`/`item_number`, `description`, `unit`, `quantity`/`qty`, optional
`spec_section`); only description, unit, and quantity are required:

```csv
item,description,unit,quantity
1,Mobilization,LS,1
2,Roadway Excavation,CY,8450
```

Put it in `expected/` — that directory is gitignored, along with `pdfs/` and
`reports/`, because real bid documents are project data rather than fixtures.

If you've already keyed the bid form into the app by hand, skip the CSV
entirely and omit `--expected`: the comparison then runs against that
project's `bid` rows, which is the closest thing to a production answer key.

## 3. Compare

```sh
node --env-file=.env.local scripts/real-job/compare.ts \
  --document <id-from-step-1> --expected ./scripts/real-job/expected/shasta.csv
```

Prints a row-by-row table and a summary, and writes a JSON + CSV report into
`reports/`.

Each row is classified as `ok`, `QTY` (quantity wrong), `UNIT` (unit wrong),
`MISSING` (on your list, not extracted), or `EXTRA` (extracted, not on your
list). A reworded description is reported as a difference underneath the row
rather than as an error — whether that matters is your call, not the script's.
Rows are matched on item number first, then on an exact description match, and
never on a guess: if neither key matches unambiguously the row is reported as
`MISSING` with the closest unmatched extraction named beside it, so a near-miss
is visible as one instead of being silently paired with the wrong row.

Use `--tolerance-pct 1` if you want small quantity differences treated as
correct; the default is exact.

The summary also reports mean self-confidence on correct vs. wrong rows.
That gap is the number to watch: a review-the-low-confidence-rows workflow
only works if the model is actually less confident when it's wrong.

## What this isn't

- Not a feature. Nothing here is reachable from the app, and `compare.ts` only
  reads.
- Not a pass/fail gate. It reports; you judge.
