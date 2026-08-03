# Decisions

## Scope

**Decision: Multi-tenant SaaS**, not an internal tool. Coby is retired from contracting and has full time to dedicate, wants a subscription model, and is targeting 40–50 contractor customers in year one (possibly via a commission-based salesperson) — a real business goal, not a personal bidding aid.

## Product wedge

**Decision: Phase 1 is document extraction + manual estimating + bid-form reconciliation** — not AI takeoff off drawings, and not a pure manual-entry tool with AI deferred entirely. It's a hybrid, scoped narrowly:

- **Upload bid documents** (plans, specs, addenda, official bid form). AI reads and extracts: project summary, bid requirements/deadlines/bonds, schedules/tables, and — most important — the official bid form's line items and quantities. This is document/data extraction, explicitly **not** measuring quantities off drawings.
- **Manual estimate workspace** — contractor enters their own quantities, unit prices, labor/material/equipment/sub, and markup. Spreadsheet-familiar, no auto-takeoff.
- **Bid-form reconciliation** — compare the contractor's estimate against the official bid form; flag missing items, quantity discrepancies, unit mismatches. This is the core differentiator.
- **Reports** — export estimate summary + reconciliation report (PDF/Excel).

**Explicitly out of Phase 1** (Phase 2+): automatic quantity takeoff off drawings (out of scope entirely for now, not just deferred), cost database connections (leave UI hooks, don't build the feeds), human review workflow, company cost setup/rate snapshots/overrides, API integrations.

**Why:** Full AI takeoff off drawings is a measurement/computer-vision problem with high accuracy risk and long tail effort. Pulling structured line items off an official bid form is a document/table-extraction problem — a meaningfully easier, more tractable problem for an LLM — and pairing it with reconciliation against manually-entered numbers is a real, sellable differentiator that doesn't require the estimate accuracy to be perfect (the contractor's own numbers are the estimate; AI just extracts and checks against the source). This ships faster and de-risks trust: if the AI extraction step is ever wrong, the contractor is entering their own numbers anyway and reconciliation surfaces the mismatch instead of silently propagating an error.

**How to apply:** Near-term roadmap work (see [ROADMAP.md](ROADMAP.md), esp. 02 Estimating Engine) should prioritize document extraction (with a "show extracted value next to source, let contractor confirm/correct" UX baked in from the start, not bolted on later) and reconciliation logic over any auto-takeoff/measurement features.

## Cost data source

**Decision: User-entered company defaults for now** (labor rates, equipment rates, markups/margins, with project-level overrides and change history) — not a licensed cost database (e.g. RSMeans) — with licensed data layered in later once there are paying customers to justify it.

This confirms rather than changes direction: `/cost-setup` (see [lib/cost-setup-data.ts](../lib/cost-setup-data.ts)) already models company-default rates + project overrides, and the Product wedge decision already scoped cost database connections out of Phase 1 (UI hooks only, no feeds).

**Why:**
- The product's differentiator is bid-form reconciliation, not "authoritative" costs — contractors bid with their own known rates today, so self-entered defaults match how they already work and lowers onboarding friction.
- Licensed data is free/fast to defer and expensive/slow to add now: it costs money, and multi-tenant *resale* of licensed cost data (40–50 subscribers) likely requires a commercial reseller agreement, not just an API integration — a legal/procurement dependency, not an engineering one. Not worth blocking Phase 1 on.
- Company-default rates are already fully modeled in the current build, so this is the zero-additional-cost path.

**How to apply:** Don't build real cost-database feeds or licensing integrations until there's a paying customer base to justify the commercial negotiation. If onboarding friction becomes a problem for brand-new contractors with no rate history, consider a small *seeded* industry-average default set (not a licensed integration) as a lighter-weight fix — that's a Phase 2+ idea, not a reason to revisit this decision now.

## Primary trade

**Decision: Civil / roadway & site work** (grading, paving, earthwork, utilities — public-agency unit-price bid work). This is the trade Coby knows well enough to hand-validate the AI's extracted bid-form line items against a real bid package, and it's already what the current demo data models (labor rates, equipment rates, and the sample "Shasta County Roadway Improvements" county public-works bid in [lib/cost-setup-data.ts](../lib/cost-setup-data.ts)).

**Why:** Extraction accuracy for the wedge (see [[Product wedge]]) can only be validated by someone who can look at the AI's output and know it's right or wrong. Civil/roadway is also a favorable vertical to start with: public-agency bid forms in this space (Caltrans/DOT-style) are typically standardized unit-price schedules, which are more extraction-friendly than negotiated/private commercial bid formats.

**How to apply:** Tune and test the document-extraction pipeline against real civil/roadway bid packages first. Treat other trades (concrete, mechanical, electrical, general building, etc.) as Phase 2+ expansion once extraction accuracy is proven and validated here — don't try to generalize the extraction prompts/logic across trades before this one is solid.

## Billing model

**Decision: Seat-based subscription, tied to org** — not usage-based. One plan, priced per user in the org, via Stripe (`lib/billing.ts`, `app/billing/`).

**Why:** The [[Product wedge]] is a team workspace — estimating plus reconciliation, used by a contractor's own estimators together — not a metered API a customer consumes programmatically. Seat-based pricing is how virtually every B2B tool shaped like this one prices (Procore, PlanSwift, etc.), and it matches the Scope decision's framing of "40–50 contractor customers" as companies, not usage volume. The one place this product genuinely has a metered, usage-sensitive cost — AI takeoff extraction calls — was deliberately *not* made the billing axis: step 25 gave it a hard per-org monthly spend cap instead of pass-through usage billing, which is itself a signal that usage isn't the intended axis for what customers pay for.

**How it works today:** every org gets a 14-day free trial with no Stripe involvement at all (computed from `org.createdAt`, not a stored flag). Subscribing creates a Stripe Checkout session with quantity = the org's current user count. There's no team-invite feature built yet, so quantity is always 1 today — this is architecturally real seat-based billing, not faked, it'll just start actually varying once org membership can grow past the founding user.

**How to apply:** Don't add a second (e.g. usage-based) billing dimension without revisiting this decision explicitly — the spend cap already covers the cost-containment need usage billing would otherwise be reached for. If/when a team-invite feature is built, subscription quantity needs to be kept in sync with headcount (not done yet — see the note in `app/billing/actions.ts`).
