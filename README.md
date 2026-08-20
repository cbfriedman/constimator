# Constimator

Bid estimating and bid-form reconciliation for civil and roadway contractors.

A contractor uploads a public agency's bid package, builds their estimate with
their own quantities and rates, and Constimator reconciles the two — flagging
items missing from the estimate, quantity discrepancies, and unit mismatches
before the bid goes out. See [docs/DECISIONS.md](docs/DECISIONS.md) for the
product scope and the reasoning behind it.

## Stack

Next.js (App Router) · React · Tailwind · shadcn/ui · Drizzle ORM · Supabase
(Postgres, Auth, Storage) · Stripe · Sentry · PostHog. AI document extraction
runs in a separate Node worker (see [worker/](worker/)) deployed on Railway, so
a slow multi-page PDF can't hit a serverless function's execution limit.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # then fill it in — see the comments in that file
pnpm db:migrate
pnpm dev
```

`.env.example` documents every variable, which are required, and what degrades
gracefully without them. The app needs `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `DATABASE_URL` to start; the rest enable
individual features.

**`DATABASE_URL` must be Supabase's transaction-mode pooler (port 6543), not
session mode.** Session mode caps concurrent clients at a small fixed pool and
has already caused a production outage here — see
[docs/DATABASE-POOLING.md](docs/DATABASE-POOLING.md).

## Commands

| | |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | End-to-end tests (Playwright) — needs a real database |
| `pnpm db:generate` | Generate a migration from schema changes |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Drizzle Studio |

The worker is a separate package with its own dependencies:

```bash
cd worker && npm install && npm run dev
```

## Repository layout

| Path | |
|---|---|
| [app/](app/) | Routes, pages, and Server Actions |
| [components/](components/) | UI components (`ui/` is shadcn) |
| [lib/](lib/) | Server-side domain logic — cost engine, billing, reconciliation |
| [db/](db/) | Drizzle schema and migrations |
| [worker/](worker/) | Standalone AI extraction worker (not part of the app) |
| [e2e/](e2e/) | Playwright suites, including a cross-org isolation test |
| [scripts/](scripts/) | Validation and load-test harnesses, each standalone |
| [docs/](docs/) | Decisions, security review, alerting, pilot plan |

## Data access

Every org-scoped read and write goes through `getScopedDb()`
([lib/db/scoped.ts](lib/db/scoped.ts)), which applies the caller's own
server-derived `org_id` to every query. ESLint blocks importing the raw Drizzle
client anywhere else — if you need data, use the scoped helpers.
[docs/SECURITY-REVIEW.md](docs/SECURITY-REVIEW.md) covers why this is the
primary isolation boundary rather than a backstop.

## Before shipping to customers

[docs/PILOT_CHECKLIST.md](docs/PILOT_CHECKLIST.md) describes the pilot and,
importantly, what is deliberately out of scope for it.
