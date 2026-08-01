# Takeoff worker (standalone — not part of the app)

Polls the `takeoff_job` table for queued rows and processes them. Exists so
that a slow, multi-page PDF takeoff job doesn't run inside a Vercel
function and hit its execution time limit — `confirmDocumentUpload` (in the
main app) queues a job and returns immediately; this is what actually
works through the queue, on its own schedule, on its own infrastructure.

**Real extraction (step 16).** `src/process-job.ts` downloads the source
PDF from Supabase Storage, rasterizes it (`src/rasterize.ts`), and sends
every page to Claude (`src/extract.ts`) using the same prompt/tool schema
validated standalone in `scripts/takeoff-validation/` (step 15). Needs
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ANTHROPIC_API_KEY` set —
see `.env.example`.

## How it works

1. `src/index.ts` runs an infinite loop: poll, sleep `POLL_INTERVAL_MS`,
   repeat. No persistent connections to manage, no missed-event problem on
   restart — it just picks up whatever's queued next time it looks.
2. `src/poll.ts` claims **one** queued job at a time with `UPDATE ...
   WHERE id = (SELECT ... FOR UPDATE SKIP LOCKED)` — the standard safe
   pattern for a Postgres-backed job queue, so if Railway ever runs more
   than one instance of this worker, two instances can't grab the same job.
3. `src/process-job.ts` looks up the job's document, downloads and
   rasterizes it, extracts quantities, and writes `complete`/`result` or
   `failed`/`error` back onto the job row (and mirrors that onto the
   document's own `status`). Failures here are caught and recorded — they
   don't crash the worker.
4. Back in the main app, `app/processing/actions.ts` picks up any
   `complete` job's result the next time `/processing` is loaded and
   regenerates the estimate's AI-extracted lines from it (see
   `generateEstimateFromTakeoff` in `app/estimate/actions.ts`) — the worker
   itself never talks to the Next.js app directly.

Why polling instead of Supabase Realtime's `postgres_changes`: Realtime
would still need a polling fallback for correctness (a worker that's
mid-restart/mid-deploy misses events), so building both for a "small"
worker wasn't worth it. Polling alone is simpler and self-healing. Revisit
if job latency ever actually matters — right now nothing in the app waits
on or displays job status, so the gap between "queued" and "picked up"
(at most `POLL_INTERVAL_MS`) isn't user-visible yet.

## Local setup

```sh
cd worker
npm install
cp .env.example .env
# fill in DATABASE_URL (same value as the main app's)
npm run dev
```

## Deploying to Railway

1. New Railway service → deploy from this GitHub repo.
2. Set the service's **root directory** to `worker` (Railway dashboard →
   service settings → Source → Root Directory). This is a per-service
   setting in Railway, not something expressible in-repo.
3. Set `DATABASE_URL` (and `POLL_INTERVAL_MS` if you want something other
   than the 5s default) in the service's environment variables.
4. `railway.json` in this directory pins the build/start commands
   explicitly (`npm install && npm run build`, then `npm start`) so Railway
   doesn't have to guess via Nixpacks auto-detection.

No public port needed — this is a worker, not a web service. If Railway's
UI insists on a healthcheck for a "web" service type, set the service type
to a plain deployment/worker (not exposed) rather than adding an HTTP
server just to satisfy a healthcheck.

## What's isolated here, and why

Own `package.json`, installed via `npm` rather than the main app's pnpm
workspace. First attempt at `scripts/takeoff-validation/` (step 15) found
that pnpm auto-discovers *any* nested `package.json` as a workspace member
even without an explicit `packages:` glob in the root `pnpm-workspace.yaml`
— it silently pulled that script's dependencies into the root
`pnpm-lock.yaml`. `npm` sidesteps that failure mode entirely, so it's used
here too for the same reason.
