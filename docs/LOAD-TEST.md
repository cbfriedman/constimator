# Load test — takeoff pipeline concurrency (step 36)

## Summary

Ran a real, bounded load test against the live database and worker: one
throwaway test org, a synthetic 2-page PDF, 6 concurrent uploads, the real
worker (`worker/`) processing them against the real `DATABASE_URL` and
`ANTHROPIC_API_KEY`. Found and fixed two real bugs along the way — one of
which meant **no real document upload could have succeeded in production
at all** before today. Confirmed the worker's documented serial,
one-job-at-a-time architecture and measured its real per-job overhead. Did
**not** get to observe actual concurrent Claude vision-call behavior
(timeouts, per-page latency under load) — the configured Anthropic API key
has a zero credit balance, so every extraction call failed immediately on
Anthropic's side rather than running. Total cost of this test: **$0.00**
(no Claude call ever got past the billing check). See "What's still
unverified" for what a follow-up test needs.

## Methodology

This was a genuinely live test, not static analysis — the first time this
session that `DATABASE_URL` has pointed at a real, reachable database (see
`docs/SECURITY-REVIEW.md`'s methodology section for how every prior
security/data step in this project had to fall back to code review alone
for exactly this reason).

Script: `scripts/load-test/` (isolated npm package, same convention as
`worker/` and `scripts/takeoff-validation/` — not part of the pnpm
workspace, not part of the Next.js app).

What it does, end to end, per run:
1. Creates one real Supabase Auth user (`constimator-load-test-<id>@constimator-test.invalid`,
   `.invalid` is the IANA-reserved TLD for exactly this purpose — never
   resolves, never delivers mail) via the admin API. This exercises the
   real `handle_new_user()` signup trigger (`db/migrations/0003`), so the
   test org is provisioned the same way a real signup would be, not
   hand-inserted.
2. Reads the resulting org id, inserts one test project directly (raw SQL
   — an admin script has no browser session to drive the real Server
   Actions with, so it reproduces their DB effects instead of the actions
   themselves; the Server Action layer itself — validation, org-scoping,
   billing gate — was already exercised and hardened in steps 23–25/30/31
   and isn't what this step is testing).
3. Generates one small synthetic 2-page PDF in memory (`pdf-lib`) — a
   clearly-fake bid schedule with plausible line-item text, since no real
   plan set is available in this environment (see step 15/21). Kept to 2
   pages specifically to bound rasterization + vision-token cost per job.
4. Fires 6 concurrent "uploads": each one uploads the same PDF bytes to a
   distinct real Storage path and inserts a `document` + `takeoff_job` row
   (`status: "queued"`) — the same end state `confirmDocumentUpload` would
   leave, all 6 fired via `Promise.all` so they queue at effectively the
   same instant.
5. Spawns the real worker (`node dist/index.js`, freshly rebuilt) as a
   child process pointed at `worker/.env`'s real credentials, and polls
   the database every 2s to record exactly when each job transitions
   `queued → running → complete/failed`.
6. Stops the worker and **always** runs cleanup in a `finally` block:
   removes the 6 Storage objects, deletes the test org (cascades every
   associated row — project/document/takeoff_job/ai_usage_event/user, see
   `db/schema.ts`'s `onDelete: "cascade"` FKs), deletes the auth user, then
   re-queries to confirm the org row is actually gone.

Concurrency was capped at 6 (not dozens) specifically to bound Claude API
cost — moot in the end, since every call was rejected before being billed.

## Findings

### 1. Storage bucket + RLS policy were never provisioned (critical, fixed)

The first run failed instantly: every one of the 6 Storage uploads
returned "Bucket not found." Querying `storage.buckets` directly against
the live project confirmed **zero buckets existed** — `db/storage-setup.sql`
(the one-time manual setup step for `project-documents` and its
org-isolation RLS policy, not part of the Drizzle migrations since
`storage.buckets`/`storage.objects` are Supabase-owned tables) had never
actually been run against this project.

This is more serious than a blocker for this test: `requestDocumentUpload`
(`app/upload/actions.ts`) asks Supabase Storage for a signed upload URL
against this same bucket before a real user can upload anything at all —
**no real document upload could have succeeded in production either**,
regardless of concurrency. This had gone unnoticed because this is the
first time in the project the database has been genuinely live long
enough to try a real upload end to end.

Flagged to the user and fixed with explicit approval: ran
`db/storage-setup.sql` against the live database (creates the bucket with
its PDF-only/500MB-cap settings, plus the org-isolation policy on
`storage.objects`). Confirmed afterward: `storage.buckets` has the
`project-documents` row, `pg_policies` has `project_documents_org_isolation`.

### 2. Blank (but declared) env vars silently defeated `??` fallbacks (fixed, 2 places)

The first real run (after fixing #1) revealed the worker's own startup log
read `"Takeoff worker started — polling every 0ms"` — not the documented
default of 5000ms. `worker/src/index.ts` had:

```ts
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 5000)
```

`worker/.env` declares `POLL_INTERVAL_MS=` with no value — that makes
`process.env.POLL_INTERVAL_MS` the empty string `""`, not `undefined`.
`??` only falls back on `null`/`undefined`, so it never triggers, and
`Number("")` is `0`. The exact same shape existed in `worker/src/extract.ts`:

```ts
const MODEL = process.env.TAKEOFF_MODEL ?? "claude-sonnet-5"
```

`worker/.env` also declares `TAKEOFF_MODEL=` blank — so `MODEL` would have
resolved to `""` the moment a real Claude call was attempted (masked in
this test by the credit-balance check failing first, before the model
name is ever validated).

Both fixed to `process.env.X || default` — `||` treats an empty string as
falsy and does fall back, which is the correct idiom for "blank means
unset" here. Re-ran after the fix: log correctly reads
`"polling every 5000ms"`. Checked the rest of the codebase for the same
`process.env.X ?? default` shape (`grep`) — the other instances
(`drizzle.config.ts`, the various Sentry `environment` fields,
`playwright.config.ts`) all read from env vars that are either always
fully set or fully absent in their real environments, not "declared blank
in a committed `.env`," so they aren't exposed to this specific bug.

### 3. Confirmed: strictly serial, one-job-at-a-time processing

No surprise given `worker/src/poll.ts`'s design (documented as
deliberately single-job-per-cycle), but now confirmed live rather than by
reading the code: across both real runs, jobs never overlapped — job N's
"Processing takeoff job" log line only ever appeared after job N-1 had
already reached `failed`. Six concurrently-queued jobs were drained one at
a time, in queue order.

### 4. Real per-job overhead, measured (post-fix run, 5000ms poll interval)

| Job | queued → running | running → failed | 
|---|---|---|
| 1 | ~8s | 22.8s |
| 2 | ~7s | 14.6s |
| 3 | ~4s | 13.3s |
| 4 | ~6s | 16.7s |
| 5 | ~5s | 12.6s |
| 6 | ~6s | 16.5s |

Total wall-clock from the first upload queuing to the last job reaching a
terminal state: **158 seconds** for 6 jobs — and every one of those 6
calls failed *immediately* on Anthropic's side (a fast 400, not a real
multi-page vision inference). That ~13–23s per job is entirely: worker
poll latency (bounded by the 5s poll interval) + Storage download +
PDF rasterization (`pdf-to-img`/`pdfjs`) + the network round trip to
Anthropic + the DB writes recording the result. **A real successful
extraction — an actual multi-page vision call running to completion —
will take measurably longer per job than these numbers**, since none of
these 6 calls ever got past Anthropic's billing check. Treat 158s/6 jobs
as a floor, not a realistic estimate: for a firm with several estimators
uploading around the same time, expect queue delay to compound roughly
linearly with however much longer real extraction turns out to add per
job.

### 5. Rasterization font warning (observed, not yet investigated)

Every job logged, twice:
```
Warning: UnknownErrorException: Unable to load font data at: standard_fonts/LiberationSans-Bold.ttf
Warning: UnknownErrorException: Unable to load font data at: standard_fonts/LiberationSans-Regular.ttf
```
from `pdf-to-img`'s underlying `pdfjs-dist` dependency. Didn't block
rasterization (jobs proceeded to the Claude call afterward), but is a
genuine, previously-unnoticed runtime warning — worth investigating
whether it affects rendering fidelity for real plan sheets that rely on
non-embedded standard fonts (most CAD-exported PDFs embed their own
fonts, so this may be harmless in practice — not confirmed either way).

### 6. Confirmed working as designed

- Rate limiting correctly fails open: `UPSTASH_REDIS_REST_URL`/`TOKEN` are
  unconfigured, and the worker logged the expected warning
  ("takeoff rate limiting is disabled") rather than blocking anything.
- The spend cap check ran without blocking (a fresh org has spent $0 this
  month, well under the $20 default cap) — consistent with `ai_usage_event`
  showing zero rows for the test org after both runs (no call ever got
  billed).
- Cleanup was verified complete after both runs: all 6 Storage objects
  removed, the org row (and everything cascaded from it) gone, the auth
  user deleted, re-query confirmed no orphaned row remained.

## What's still unverified

The one thing this step actually set out to measure — **how the pipeline
behaves under real concurrent Claude vision calls** (do they queue cleanly
behind each other, does anything time out, does per-page latency change
under load, is 158s/6-jobs actually representative once real inference
time is added) — could not be observed. The `ANTHROPIC_API_KEY` configured
in `worker/.env` has no credit balance, so all 6 calls in both runs failed
identically and instantly on Anthropic's own billing check, before any
real inference happened.

## Follow-up (once the Anthropic account has credit)

Re-run the exact same test — nothing else needs to change:

```
cd scripts/load-test
npm install   # if not already
npx tsx src/run.ts
```

Defaults to 6 concurrent uploads (`LOAD_TEST_CONCURRENCY` env var to
change it); creates and fully cleans up its own throwaway org each run.
With real credit available, this will show real per-job extraction
latency and confirm (or contradict) whether the ~13–23s of non-Claude
overhead measured above holds once actual multi-page vision inference is
added on top — that combined number is the one that actually matters for
telling a multi-estimator firm what to expect from a batch upload.
