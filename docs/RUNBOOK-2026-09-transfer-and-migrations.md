# Runbook — repo transfer, migrations 0015/0016, and first deploy of `main` @ `4ecc086`

Written 15 Sep 2026 against the local clone at `D:\Working\Jacob\Constimator` (on `main` at
`4ecc086`, identical to `frostwebdev-dotcom/constimator`). Do the sections in order. Each
"verify" step has a concrete pass condition — don't move on without it.

Nothing here is destructive except §5 (history purge), which is marked.

---

## 0. What's about to go live, and why order matters

`main` now carries two schema changes and code that depends on them:

| Migration | Change | Code that depends on it |
|---|---|---|
| `0015_secure_invite_org_join.sql` | Replaces `handle_new_user()` — org/role now come from the `invite` table, not signup metadata | Nothing breaks if missing; the **security hole stays open** until it runs |
| `0016_takeoff_items_confirmed.sql` | Adds `takeoff_job.items_confirmed_at`, backfills existing complete jobs | `app/processing/actions.ts` reads the column on every `/processing` load — **errors with "column does not exist" if the code deploys first** |

So: **migrations before code**, or in the same minute. Both migrations are additive (`ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`) — safe to run against a live database with the old code still serving.

`pnpm db:migrate` reads `DATABASE_URL` from `.env.local` (`drizzle.config.ts`). **Whatever URL is in that file is the database you migrate.** Check it before every run.

---

## 1. Transfer checklist — do this first

The GitHub repo moved from `cbfriedman` to `frostwebdev-dotcom`. The code doesn't care, but three external systems are tied to the deployment URL, and one to the GitHub owner.

### 1a. Vercel (tied to GitHub owner)
- [ ] Open the Vercel project → **Settings → Git**. Confirm the connected repository reads `frostwebdev-dotcom/constimator`. If it still shows `cbfriedman/constimator` or "disconnected", reconnect it. If the Vercel project lives under Coby's Vercel account, decide now whether it moves to yours (Vercel supports project transfer) — that decides who holds the env vars below.
- [ ] **Settings → Environment Variables.** Every one of these must be present in Production. Names only — never paste values into chat:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` — app won't start without them
  - `DATABASE_URL` **must be the transaction-mode pooler, port 6543** (`docs/DATABASE-POOLING.md` — this has caused an outage before)
  - `SUPABASE_SERVICE_ROLE_KEY` — worker + storage cleanup
  - `STRIPE_SECRET_KEY`, `STRIPE_SEAT_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`
  - `CRON_SECRET`, `HEALTH_CHECK_TOKEN` — **set these**; both endpoints fail *open* when unset (audit S9)
  - `SENTRY_ORG`, `SENTRY_PROJECT`, Sentry DSN; `UPSTASH_*`; `RESEND_*`; PostHog key (all degrade gracefully if missing, but set them)
- [ ] `vercel.json` registers the uptime cron every 5 minutes. On a **Hobby** plan Vercel cron runs once a day and `docs/ALERTING.md` says this is a known trap — check the plan.

### 1b. Production URL (tied to Vercel, not GitHub)
**If the Vercel project is the same one as before, the URL didn't change and you can skip this.** If a new Vercel project was created, the production domain changed and three things break silently:
- [ ] **Stripe → Developers → Webhooks**: endpoint must be `https://<prod-domain>/api/webhooks/stripe`. Re-create it if the domain changed and update `STRIPE_WEBHOOK_SECRET`.
- [ ] **Supabase → Authentication → URL Configuration**: Site URL = prod domain; Redirect URLs must include `https://<prod-domain>/auth/callback` and `https://<prod-domain>/accept-invite`. Teammate invites and sign-in both break without this.
- [ ] `getAppOrigin()` (`lib/app-url.ts`) derives from the request `Host` header, so it follows whatever domain serves the request — no env change needed, but it's why the Supabase allowlist above matters.

### 1c. GitHub Actions
- [ ] The CI workflow uses **no repository secrets** (checked), so it runs as-is under the new owner. Just confirm Actions is enabled on the transferred repo (Settings → Actions) — GitHub sometimes disables it on transfer.

### 1d. Railway (the worker)
- [ ] The worker deploys separately from Railway. If Railway was linked to the GitHub repo for auto-deploy, re-link it to `frostwebdev-dotcom/constimator`. Its env needs `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `UPSTASH_*`.

---

## 2. Rehearse the migrations on a branch database

Never first-run a migration on production. Supabase gives you a branch for exactly this.

1. **Supabase Dashboard → Branches → Create branch** from production (or use `supabase branches create` with the CLI). Note its connection string.
2. On your machine, in `D:\Working\Jacob\Constimator`:
   ```powershell
   # Temporarily point at the BRANCH database. Keep the production URL somewhere safe.
   # Edit .env.local: DATABASE_URL=<branch pooler URL, port 6543>
   pnpm db:migrate
   ```
3. **Verify** — run in the Supabase SQL editor against the **branch**:
   ```sql
   -- 0015 landed: the function now reads from public.invite, not metadata
   select position('public.invite' in prosrc) > 0     as reads_invite_table,
          position('raw_user_meta_data' in prosrc) > 0 as still_reads_metadata
   from pg_proc where proname = 'handle_new_user';
   -- expect: reads_invite_table = true, still_reads_metadata = false
   -- (the comment header mentions raw_user_meta_data; prosrc is the body only)

   -- 0016 landed: column exists, existing complete jobs are backfilled
   select count(*) filter (where status = 'complete' and items_confirmed_at is null) as unbackfilled,
          count(*) filter (where status = 'complete')                                 as complete_total
   from takeoff_job;
   -- expect: unbackfilled = 0

   -- drizzle recorded both
   select id, hash, created_at from drizzle.__drizzle_migrations order by created_at desc limit 3;
   -- expect: two new rows
   ```
4. **Test the trigger on the branch** (this is the security fix — prove it):
   - In the app pointed at the branch, invite a teammate as `viewer`. Confirm they land in the inviting org with role `viewer`: `select email, role, org_id from "user" where email = '<invitee>'`.
   - Then the attack. With the branch's anon key:
     ```bash
     curl -X POST "https://<branch-ref>.supabase.co/auth/v1/signup" \
       -H "apikey: <ANON_KEY>" -H "Content-Type: application/json" \
       -d '{"email":"attacker@example.com","password":"Xx-test-1234","data":{"orgId":"<SOME REAL ORG UUID>","role":"admin"}}'
     ```
     Then: `select email, role, org_id from "user" where email = 'attacker@example.com'`.
     **Pass:** `org_id` is a **new** org (not the one you named), role `admin` of that new solo org. **Fail:** `org_id` equals the org you named — stop, do not deploy.
5. Restore `.env.local` to the production `DATABASE_URL`. Delete the branch when done.

---

## 3. Apply to production

1. **Backup.** Supabase → Database → Backups: confirm a recent daily backup exists, and note whether PITR is enabled (`docs/DATA-RETENTION.md` says the backup window was "not yet confirmed" — confirm it now, this is your rollback).
2. **Pause deploys.** Vercel → Deployments: make sure nothing is mid-deploy. If `main` auto-deploys, either temporarily disable the Git integration or be ready to run §4 within a minute of §3.
3. Confirm `.env.local` `DATABASE_URL` is production, pooler, port 6543. Then:
   ```powershell
   pnpm db:migrate
   ```
   Expected output: two migrations applied, no errors. Takes seconds — `0016`'s backfill is one `UPDATE` on a small table.
4. **Verify** — same three SQL checks as §2.3, against production.

**If `db:migrate` errors partway:** both files are idempotent (`IF NOT EXISTS`, `OR REPLACE`), so fix the cause and re-run. Do not hand-edit `drizzle.__drizzle_migrations`.

---

## 4. Deploy the code

1. One last build on the tip, since `4cd0e6b`/`4ecc086` were type-checked but not full-built:
   ```powershell
   pnpm build
   cd worker; npm run typecheck; npm test; cd ..
   ```
2. Push/redeploy `main` (Vercel) and redeploy the worker (Railway).
3. **Smoke test, in this order** — each takes under a minute:
   - [ ] `/` loads dark navy with the new hero; no invented metrics in the trust strip.
   - [ ] Sign in → `/dashboard` shows the project overview (tiles + donut) for the current project. With no bid form imported it should say so, not error.
   - [ ] `/processing` on a project with a finished plan takeoff shows **"Add to estimate"** and the sheet count. Estimate is empty until clicked. Click it → toast → lines appear on `/estimate` at `$0`.
   - [ ] `/cost-setup` on a **new** org shows the "Enter your company's rates" banner and all zeros — no Operator Group 3 at $55.10.
   - [ ] `/estimate` has no "Recalculate" button and no "Simulate rate change" link.
   - [ ] As a `viewer`-role user, try to delete an estimate line → clear error, nothing deleted.
   - [ ] Upload a document → confirm it processes (proves the storage-path validator accepts real paths and the worker's segment check + encoding accept real downloads).
   - [ ] `curl https://<prod>/api/health -H "Authorization: Bearer $HEALTH_CHECK_TOKEN"` → `ok`, worker heartbeat fresh.
4. Watch Sentry for 15 minutes. The one expected new signal: nothing. If `/processing` throws `column "items_confirmed_at" does not exist`, §3 didn't run against the database Vercel is using — check `DATABASE_URL` in Vercel matches the one you migrated.

---

## 5. Credential rotation and history purge — destructive, do last

The IONOS SFTP password in `.vscode/sftp.json` is in git history in every clone.

1. **Rotate the password at IONOS.** Everything below is pointless before this.
2. Tell anyone with a clone (Coby) that history is about to be rewritten and they must re-clone afterwards.
3. Purge — on your machine, from a **fresh** clone so the working copy isn't affected:
   ```powershell
   pip install git-filter-repo
   git clone https://github.com/frostwebdev-dotcom/constimator.git constimator-purge
   cd constimator-purge
   git filter-repo --invert-paths --path .vscode/sftp.json
   git remote add origin https://github.com/frostwebdev-dotcom/constimator.git
   git push --force --all origin
   git push --force --tags origin
   ```
4. GitHub keeps unreachable objects for a while and old PR/commit URLs may still resolve. Ask GitHub Support to run garbage collection on the repo if you want it gone from their side too — or accept that step 1 already made the leaked value worthless.
5. Re-clone your working directory (or `git fetch && git reset --hard origin/main` in `D:\Working\Jacob\Constimator`).

---

## 6. Rollback

- **Code:** Vercel → Deployments → promote the previous deployment. The old code ignores the new column and the new trigger works for it too. Safe at any time.
- **Migrations:** there are no down migrations (`docs/DECISIONS.md`: migrations are additive by policy). Neither needs reverting for the old code to run. If you truly must revert `0015`, re-run `db/migrations/0008_invite_org_join_on_signup.sql`'s function body by hand — **but that re-opens the security hole**, so don't.
- **Data:** restore from the backup confirmed in §3.1. `0016`'s backfill only sets a timestamp on rows that were already complete; there is nothing to lose.

---

## 7. After it's live — still open from the audit

Not blockers for this deploy, but the next things:
- `estimate_line.markup_pct` DB default of `'10'` — a manually added line still gets a 10% markup nobody chose.
- Worker heartbeat is recorded before each job, so every multi-minute takeoff trips the `worker-down` alert (audit O1). Expect false pages until fixed.
- No stuck-job reaper (O2); e2e not in CI (O6).
- Run List 1.8 — real-PDF validation — before telling anyone the extraction is reliable.
