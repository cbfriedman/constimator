# Security review — cross-org data access (step 30)

## Methodology — read this before the findings

The step 30 brief asked for a live test: create two orgs, sign in as one,
and try to fetch the other's projects/documents/estimates by guessing or
reusing IDs, through the UI and through direct API calls.

**That live test was not run.** `DATABASE_URL` in this environment has
been an unfilled placeholder for the entire project (every step since
step 9 has noted this) — nothing that touches the database, including
signing up a real user or creating a real org, has ever been executable
here. Claiming a live penetration test happened when it didn't would be
worse than not doing the review at all: a security review's entire value
is that its findings are true.

What actually happened instead: a full static audit of every code path
that takes an ID from a client and uses it, re-tracing each one from the
Server Action or route handler down to the database query, specifically
looking for the class of bug this test is designed to catch — a place
where org A's own request could touch org B's data because an ID wasn't
checked against the caller's org before being used. This is a real,
substantive review, and it found and fixed four genuine issues (below) —
but it's not a substitute for actually running the live test once
`DATABASE_URL` is real. See "Live test plan" for exactly how to do that.

## What was audited

Every `"use server"` file in the app (confirmed exhaustively by grepping
for the directive, not just checking the ones already known about):

- `app/upload/actions.ts`
- `app/reconciliation/actions.ts`
- `app/estimate/actions.ts`
- `app/processing/actions.ts`
- `app/projects/new/actions.ts`
- `app/cost-setup/actions.ts`
- `lib/project-state-actions.ts`

Plus the one real API route (`app/auth/callback`), the new one from step
29 (`app/api/health`), every page that accepts an id via `searchParams`
(`/upload`, `/processing`), the request-auth middleware (`proxy.ts` /
`lib/supabase/middleware.ts`), Supabase Storage's RLS policy
(`db/storage-setup.sql`), and the worker's raw SQL (`worker/src/*.ts`,
which step 24 already covered once — re-checked here for anything new
since).

Important thing to know about this codebase going in: every exported
async function in a `"use server"` file is a directly callable endpoint
on its own, regardless of which page's UI happens to call it. A function
that's "only ever called from a page that already validated the ID" is
not actually protected by that — an attacker skips the page entirely and
calls the Server Action directly with whatever arguments they want. Every
finding below is exactly that shape: a function that assumed a client-
supplied id was safe because of who *usually* calls it.

## Findings and fixes

### 1. Cross-org document exfiltration via the worker's storage download (high severity, fixed)

`confirmDocumentUpload` (`app/upload/actions.ts`) accepted a client-
supplied `path` with no check that it actually belonged to the caller's
org. Supabase Storage paths follow a predictable shape
(`{org_id}/{project_id}/{uuid}-{filename}`), so an org A user could call
this Server Action directly with a `path` pointing at a real org B
object — anything previously seen or reused, which is exactly the
scenario this step describes.

That alone doesn't leak anything, since Storage's own RLS
(`db/storage-setup.sql`, keyed on the path's org-id segment matching the
requester's session) blocks a normal read of someone else's path. But
`worker/src/download-document.ts` downloads whatever `document.storage_path`
says using the **service-role key**, which bypasses Storage RLS entirely
— it has no user session to check against, that's the reason it needs
that key. Chained together: org A creates a `document` row (owned by
their own org) whose path points at org B's real file → queues a takeoff
job → the worker downloads org B's actual document via the service-role
key → AI-extracts it → the result lands in a `takeoff_job` row org A can
read through their own account. A real, exploitable path to another
org's document content.

**Fixed** two ways:
- `confirmDocumentUpload` now rejects any `path` that doesn't start with
  the caller's own `{org_id}/` prefix.
- `worker/src/process-job.ts` independently checks the same thing
  immediately before calling `downloadDocument` — defense in depth, since
  that's the actual point where the RLS bypass happens, rather than
  trusting the app-layer check was never bypassed by a bug or a future
  code path.

### 2. Cross-org foreign-key references on insert (medium severity, fixed, 3 places)

Three Server Actions accepted a client-supplied `projectId` and used it
directly in an `insert()` — the new row would be stamped with the
caller's own `org_id` (so nothing became readable by another org through
this alone), but it created a row whose foreign key pointed at a project
belonging to a different org, which a database foreign key doesn't
prevent (it only requires the referenced row to exist *somewhere*, not
that it belongs to the same org).

- `getOrCreateCurrentEstimate` (`lib/current-project.ts`) — the shared
  chokepoint for two of these: `addEstimateLineAction` and
  `generateEstimateFromTakeoff` (both in `app/estimate/actions.ts`) call
  it with a raw client-supplied `projectId`. Fixed at the chokepoint
  itself, so both callers are covered by one change.
- `addBidLineAction` (`app/reconciliation/actions.ts`) — same shape,
  fixed directly.

All three now verify the project exists *for the caller's own org*
(`scopedDb.projects.findFirst`, which is already org-scoped — so this is
really just adding the check that was missing, not new infrastructure)
before using its id, throwing "Project not found" otherwise — the same
pattern `requestDocumentUpload` already used correctly.

### 3. `/api/health` was unreachable by the thing it's for (functional bug, fixed)

Found while re-checking step 29's work as part of this review, not a
data-isolation issue but worth fixing alongside these: the auth
middleware (`lib/supabase/middleware.ts`) redirects any unauthenticated
request to `/sign-in`, and `/api/health` wasn't excluded from that. An
external uptime monitor has no Supabase session and can't complete a
sign-in redirect — the health check endpoint built in step 29 was
silently defeated by the same middleware that's supposed to protect
everything else. Fixed by bypassing the middleware entirely for that one
path (its own `HEALTH_CHECK_TOKEN` check is the real gate, not a session
cookie).

### 4. Non-constant-time token comparison on `/api/health` (low severity, fixed)

`token !== expectedToken` leaks timing information about how many
leading characters of a guess were correct. Low practical severity
(network jitter over the internet dwarfs this, and the token only gates
aggregate operational counts, not tenant data) but a one-line fix done
right: both values are hashed (SHA-256) and compared with
`crypto.timingSafeEqual` instead.

## What was confirmed already safe (not a finding, but worth stating explicitly)

- Every *read* path — every `findFirst`/`findMany` across every action
  and page — goes through `getScopedDb()`, whose `orgScoped()` wrapper
  unconditionally ANDs `org_id = <the caller's own, server-derived org>`
  into the query. There is no client-suppliable parameter anywhere that
  changes which org a read is scoped to. This reconfirms step 24's
  finding; nothing built since (steps 25–29) introduced a bypass.
- `/upload?project=<id>` and `/processing?project=<id>` — the two pages
  that take a project id from the URL — both return the same "not found"
  response whether the id doesn't exist at all or belongs to another org.
  No enumeration signal either way.
- `app/api/health`'s cross-org query (the one place in the app that
  deliberately looks across every org — see `lib/db/system.ts`) only ever
  returns aggregate counts, never a project/org/document identifier.
- Update-by-id actions that don't insert a new row (`overrideEstimateLineAction`,
  `updateBidLineAction`, `deleteBidLineAction`, `updateCostItemAction`,
  `triggerRateDriftAction`, and similar) are inherently safe against a
  foreign id: the org-scoped `WHERE` clause matches zero rows for another
  org's id, so the call silently no-ops rather than affecting or
  revealing anything.
- ESLint's `no-restricted-imports` rule still correctly blocks every file
  except `lib/db/scoped.ts` and `lib/db/system.ts` from importing the raw
  Drizzle client — verified no new bypass was added since step 24.

## Minor observation, not fixed

`lib/project-state-actions.ts`'s `triggerRateDriftAction`, `dismissDriftAction`,
`recalculateAction`, and `resetProjectStateAction` take a bare
`estimateId: string` with no zod validation (step 23's sweep was scoped
to `app/`, and this file lives under `lib/` despite also being a
`"use server"` file — a real gap in that step's stated scope, worth
noting). Not a security issue on its own: every one of these is an
org-scoped update-by-id, so a malformed or foreign id just no-ops rather
than doing anything. Consistency gap, not an authorization gap — flagged
here rather than fixed, since fixing it is step-23-shaped work, not
step-30-shaped work.

## Live test plan (not yet run — needs a real `DATABASE_URL`)

Once the database is real, this is the actual test to run:

1. **Create two orgs.** Sign up two separate accounts with different
   email addresses (the org-provisioning trigger creates one org per
   sign-up automatically). Call them Org A and Org B.
2. **Give Org B real data.** Signed in as Org B: create a project, upload
   a document, add a few bid form line items, add a few estimate lines.
   Note the project's id, a document's id, a bid line's id, and an
   estimate line's id — visible in dev tools' network tab (Server Action
   responses include the row, id and all) or via `pnpm drizzle-kit studio`
   against the real database.
3. **Sign in as Org A** in a separate browser profile / incognito window
   (so the two sessions don't collide).
4. **Try the URL-based read paths:**
   - `/upload?project=<Org B's project id>` — expect "Project not found."
   - `/processing?project=<Org B's project id>` — expect "No project
     found."
5. **Try direct Server Action calls with Org B's ids, as Org A.** Server
   Actions aren't a conventional REST API — they're POST requests Next.js
   sends to the current page URL with a `Next-Action` header identifying
   which function to run and a serialized argument list as the body.
   Concretely: open dev tools' Network tab, perform the equivalent action
   in Org A's own UI once (e.g. add a bid line item) to capture the real
   request shape and the `Next-Action` id, then replay it with curl/Postman
   — same session cookie, same `Next-Action` header, but with Org B's id
   swapped into the arguments. Specifically try:
   - `addBidLineAction(<Org B's project id>, {...})` — expect "Project
     not found" after this review's fix (previously would have silently
     succeeded with a cross-org reference).
   - `addEstimateLineAction(<Org B's project id>, {...})` — same
     expectation.
   - `confirmDocumentUpload({projectId: <Org A's own project>, path:
     "<Org B's real storage path>", ...})` — expect "Storage path does
     not belong to your organization."
   - `updateBidLineAction(<Org B's bid line id>, {...})`,
     `deleteBidLineAction(<Org B's bid line id>)`,
     `overrideEstimateLineAction(<Org B's estimate line id>)` — expect no
     visible error (these fail closed silently) but confirm via
     `drizzle-kit studio` that Org B's row is genuinely unchanged.
6. **Confirm the fixed exfiltration path is actually closed:** attempt
   the full chain from finding #1 above end to end — call
   `confirmDocumentUpload` as Org A with Org B's real storage path,
   confirm it's rejected before a `takeoff_job` ever gets queued.
7. **Record results** — pass/fail per case — as an update to this
   document, replacing this plan section with actual results and the
   date it was run.
