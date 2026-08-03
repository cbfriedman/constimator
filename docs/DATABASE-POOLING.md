# Database connection pooling — production outage

## What happened

`/reconciliation` and `/reports` were down in production, both showing a
generic "This page couldn't load" error. The actual server-side error,
found by pulling live Vercel logs (`vercel logs <deployment-url> --level
error`):

```
Error: Failed query: insert into "reconciliation_item" (...)
[cause]: ip: (EMAXCONNSESSION) max clients reached in session mode -
max clients are limited to pool_size: 15
```

## Root cause

`DATABASE_URL` was configured against Supabase's **Session-mode pooler**
(port 5432) — a hard, small, shared cap on concurrent client connections
(15 in this case) across the *entire* database. That's the wrong pooler
mode for a serverless deployment: Vercel runs multiple function instances
concurrently under any real traffic, each opening its own connection via
`lib/db/client.ts`'s module-level singleton. A handful of people loading
different pages at the same moment (visible in the logs as several
concurrent `GET /dashboard`, `/upload`, `/projects`, etc.) was enough to
exceed 15 total connections, and every query that arrived once the pool
was full failed outright with the error above.

The confusing part: the connection code was already written *assuming*
transaction-mode pooling —

```ts
// prepare: false — required when connecting through Supabase's pooled
// (Supavisor/PgBouncer, transaction-mode) connection string...
```

— but `.env.example` told whoever set up `DATABASE_URL` to use **Session**
mode instead, directly contradicting the code's own assumption. Nobody
had hit the mismatch until real concurrent traffic actually exhausted the
session-mode pool.

## Fixes

1. **`lib/db/client.ts`**: added `max: 1` to the `postgres()` client —
   caps each serverless instance to a single connection, trading a little
   intra-request query parallelism (a `Promise.all` of two queries now
   serializes on one connection instead of running truly in parallel) for
   not exhausting the pool under load. This helps regardless of pooler
   mode and is cheap insurance even after fix #2 below.
2. **`.env.example`**: corrected the guidance to point at Supabase's
   **Transaction-mode pooler (port 6543)** instead of Session mode (port
   5432) — transaction-mode pooling is what Supavisor/PgBouncer is
   actually designed to multiplex many short-lived serverless connections
   through, and matches what the client code already assumed.

## What still needs to happen (can't be done from here)

**The actual live `DATABASE_URL` value in Vercel's project environment
variables still needs to be updated** — fix #2 above only corrects the
documentation for future setups; it doesn't change what's already
configured in production. To finish this:

1. Supabase dashboard → Project Settings → Database → Connect → switch
   the connection string mode from **Session** to **Transaction** → copy
   the resulting URI (same host/credentials, port changes from `5432` to
   `6543`).
2. Vercel dashboard → constimator project → Settings → Environment
   Variables → update `DATABASE_URL` to that new value (Production
   environment).
3. Redeploy (or trigger a new deployment) so the running functions pick
   up the new value — Vercel doesn't hot-reload environment variables into
   already-running instances.
4. Worth doing the same check for `worker/.env`'s `DATABASE_URL` even
   though the worker isn't the cause here (it's a single long-running
   Railway process, not many concurrent serverless instances, so it was
   never at risk of this specific failure) — but there's no reason for it
   to use a different pooler mode than the app once the app's is corrected.

Until step 1-3 happen, the `max: 1` fix reduces how much pressure the app
puts on the pool, but the underlying 15-connection ceiling is still small
enough that a real pilot contractor's team using the app concurrently
could hit it again.
