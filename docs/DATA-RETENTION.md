# Data retention policy

**Status: internal reference, superseded as the customer-facing document by
[/privacy](../app/privacy/page.tsx) as of step 33.** This still describes
how Constimator actually handles data at the implementation level (useful
when changing the schema or adding a new integration — update both this
file and the published Privacy Policy together), but the Privacy Policy is
now the one with real legal weight, and still needs the legal review noted
below before being relied on as final.

## What we store

- **Uploaded documents** — plan sets, specifications, addenda, and official
  bid forms you upload (PDF only), stored in Supabase Storage.
- **Bid and estimate data** — the official bid form's line items as you
  enter them, your own estimate quantities and pricing, and the
  reconciliation results comparing the two.
- **Company defaults** — labor/equipment rates and markup you configure in
  Cost Setup.
- **AI processing records** — for documents you submit for AI takeoff
  extraction: the extracted results, any error messages, and a log of
  token usage per call (used to enforce your monthly spend cap — this log
  is counts and estimated cost only, it doesn't contain document content).
- **Account data** — your name, email, and org membership, managed via
  Supabase Auth.
- **Product usage analytics** — which pages you visit and when you
  complete core actions (project creation, upload, takeoff completion,
  reconciliation, export attempts), tied to your account, not to document
  content or bid/estimate data (step 34).

We do not sell or share this data with third parties beyond the service
providers required to run the product (Supabase for database/storage/auth,
Anthropic for AI extraction, Railway for the background processing worker,
Stripe for billing, Sentry for error tracking, Upstash for rate limiting,
Vercel Analytics and PostHog for product usage analytics).

## How long we keep it

- **While your account is active**: indefinitely, so your projects, bids,
  and estimates stay available across sessions the way you'd expect from
  any project you haven't deleted yourself.
- **After you delete a project or document**: removed from primary storage
  immediately. It may persist in encrypted, automated database backups for
  a limited window afterward (consistent with our database provider's
  backup retention) before being fully purged from those too.
- **After account/org closure or a deletion request** (see below): all
  documents, bid data, estimates, and account data are deleted within 30
  days, subject to the same backup-purge window above.
- Aggregate, de-identified usage metrics that don't identify your org or
  contain your data (e.g. overall product usage counts) may be retained
  longer for our own product analytics.

## Requesting deletion

**Self-service (whole account).** An org admin can delete the organization
and everything in it from **Settings → Delete this company**
(`deleteOrgAction` in [app/settings/actions.ts](../app/settings/actions.ts)).
It runs immediately, requires typing the company name to confirm, and
deletes in this order:

1. Every uploaded document in Supabase Storage under the org's `{orgId}/`
   prefix.
2. Every member's Supabase Auth user — `public.user.id` cascades from
   `auth.users`, so this removes membership rows too.
3. The `org` row, which cascades every remaining project, document,
   estimate, bid, and reconciliation row (see `db/schema.ts`'s
   `onDelete: "cascade"` foreign keys).

Each step is idempotent, so a partial failure can be retried by running it
again. Deleting the account does **not** cancel Stripe billing — that's
done separately under Billing, and the UI says so.

**By request (anything narrower).** For a copy of your data, a correction,
or deletion of specific projects/documents rather than the whole account:

- **Email:** support@constimator.com
- **What to include:** your org name and the email address on the account,
  and what specifically you want removed.
- **What happens:** we confirm the request, delete the specified data
  within 30 days, and confirm back to you when it's done.

## Open items before this is a real, published policy

- Legal review of the language and timelines above. **Still outstanding —
  this is the remaining blocker on the published Privacy Policy and Terms.**
- A real, monitored support contact address. `support@constimator.com`
  appears in the Privacy Policy, the Terms, the spend-cap alert email, and
  the pricing page; confirm it's monitored before launch.
- ~~Self-service deletion in-app, so this doesn't stay a manual process.~~
  Done — see above.
- Confirming and stating the exact backup retention window once the
  Supabase project's backup configuration is verified (see the note on
  this in the step 29 summary — not yet confirmed as of this writing).
