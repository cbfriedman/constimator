import { relations, sql } from "drizzle-orm"
import {
  type AnyPgColumn,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgPolicy,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import type {
  ExtractedBidItem,
  ExtractedPlanHolder,
  ExtractedQuoteCondition,
  ExtractedTakeoffItem,
} from "@/lib/cost-engine/types"

// Every table's RLS policy checks its org_id (or, for `org` itself, its id)
// against this. See the current_org_id() function in db/migrations for why
// it's a SECURITY DEFINER SQL function rather than an inline subquery on the
// "user" table.
const callerOrgId = sql`public.current_org_id()`

function orgIsolationPolicy(tableName: string, orgIdColumn: AnyPgColumn) {
  return pgPolicy(`${tableName}_org_isolation`, {
    for: "all",
    to: "authenticated",
    using: sql`${orgIdColumn} = ${callerOrgId}`,
    withCheck: sql`${orgIdColumn} = ${callerOrgId}`,
  })
}

// Supabase-managed auth schema. Only declared far enough to reference
// auth.users.id from our own users table — Supabase owns everything else
// here. Deliberately NOT exported: drizzle-kit generates CREATE TABLE for
// every table exported from this file, and auth.users already exists
// (Supabase creates and owns it) — exporting it would try to recreate it.
const authSchema = pgSchema("auth")
const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
})

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "estimator",
  "pm",
  "viewer",
])

export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "documents",
  "processing",
  "ready",
  "estimating",
  "reconciliation",
])

export const documentTypeEnum = pgEnum("document_type", [
  "plans",
  "specifications",
  "bid_form",
  "addendum",
  // Step 41 — a quote a subcontractor sent the prime for one trade on this
  // project. Unlike the four above (documents the *agency* published), this
  // is a document the prime received, and it routes to its own extractor —
  // see worker/src/extract-quote-conditions.ts.
  "sub_quote",
  // A plan holders list — the roster an agency publishes of everyone who
  // pulled the bid documents. Like bid_form it's an agency document, but it
  // says nothing about the work: it's who else is bidding. Routes to its own
  // extractor, see worker/src/extract-plan-holders.ts.
  "plan_holders",
  "other",
])

export const documentStatusEnum = pgEnum("document_status", [
  "uploaded",
  "processing",
  "processed",
  "failed",
])

export const takeoffJobStatusEnum = pgEnum("takeoff_job_status", [
  "queued",
  "running",
  "complete",
  "failed",
])

// Step 41 — a sub quote's own lifecycle, which is deliberately NOT the same
// as its document's `document_status`. A document is "processed" the moment
// the worker finishes reading it; a quote is only "confirmed" once a human
// has actually accepted what the AI read off it. Keeping them separate is
// what makes the review gate real rather than cosmetic — see
// quote_condition.is_confirmed.
export const subQuoteStatusEnum = pgEnum("sub_quote_status", [
  "uploaded",
  "extracting",
  "needs_review",
  "confirmed",
  "failed",
])

// A plan holder list's own lifecycle. Same five states as
// subQuoteStatusEnum and for the same reason: the document is "processed"
// when the worker finishes, but the list is only "confirmed" once a human
// has accepted what was read off it. Nothing downstream reads an
// unconfirmed list.
export const planHolderListStatusEnum = pgEnum("plan_holder_list_status", [
  "uploaded",
  "extracting",
  "needs_review",
  "confirmed",
  "failed",
])

// How far a plan holder row has got toward being tied to a known contractor
// in the registry.
//
// Every row is "unmatched" today, and that is not a bug: there IS no
// contractor registry in this schema yet. docs/REGISTRY-SOURCES.md is a
// source spike — scripts/registry/ holds throwaway probes and, in its own
// words, "nothing in the app reads either source yet". Resolution by fuzzy
// name plus licence number needs a contractors table loaded from the CSLB
// master file (244,471 licences, free daily download) that hasn't been built.
//
// This enum and plan_holder_contact.contractor_id are the seam for that
// work, written now so it lands later as a backfill over existing rows
// rather than a migration plus a re-extraction of every list already
// ingested. Until then the review screen shows the verbatim name and
// licence number, which is what an estimator actually reads anyway.
//
//   unmatched — not yet run against a registry (the only value in use today)
//   matched   — resolved to one contractor, contractor_id set
//   ambiguous — several plausible contractors; needs a human, id stays null
//   rejected  — a human looked and said none of the candidates is right
export const planHolderMatchStatusEnum = pgEnum("plan_holder_match_status", [
  "unmatched",
  "matched",
  "ambiguous",
  "rejected",
])

// Step 41 — the conditions a sub attaches to their price. Deliberately a
// closed enum rather than free text: the whole point of the comparison grid
// is that the same condition lines up across every sub's quote, which can't
// happen if the AI is free to invent a new label per document. "other" is
// the escape hatch for a real condition that fits nothing here, and its
// presence in the data is the signal that this list needs another value.
export const quoteConditionCategoryEnum = pgEnum("quote_condition_category", [
  "exclusion",
  "inclusion",
  "mobilization",
  "pricing_basis",
  "minimum_charge",
  "quantity_assumption",
  "price_validity",
  "bond",
  "tax",
  "prevailing_wage",
  "traffic_control",
  "work_hours",
  "material_supply",
  "disposal",
  "site_access",
  "weather",
  "insurance",
  "retainage",
  "other",
])

export const costItemCategoryEnum = pgEnum("cost_item_category", [
  "labor",
  "equipment",
  "margin",
])

export const equipmentOwnershipEnum = pgEnum("equipment_ownership", [
  "owned",
  "rental",
])

export const sourceKindEnum = pgEnum("source_kind", [
  "official",
  "ai_extracted",
  "manual",
  "reviewed",
  "overridden",
])

export const reconciliationStatusColorEnum = pgEnum(
  "reconciliation_status_color",
  ["green", "amber", "yellow", "red"],
)

export const reconciliationFilterEnum = pgEnum("reconciliation_filter", [
  "matched",
  "quantity_discrepancy",
  "low_confidence",
  "missing",
  "lump_sum",
  "unit_converted",
])

// Mirrors components/review/request-review-card.tsx's scopeOptions ids.
export const reviewScopeEnum = pgEnum("review_scope", [
  "full",
  "reconciliation",
  "discrepancy",
  "proposal",
])

export const reviewRequestStatusEnum = pgEnum("review_request_status", [
  "requested",
  "in_progress",
  "completed",
])

// Step 31 — mirrors Stripe's own subscription status values exactly
// (trialing/active/past_due/canceled/unpaid/incomplete/incomplete_expired/
// paused), plus "none" for an org that has never started a Stripe
// subscription at all — the state every org is in at signup, and stays in
// for its entire free trial window (see lib/billing.ts — trial length is
// computed from org.createdAt, not stored here).
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "none",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
])

// ---------------------------------------------------------------------------
// org
// ---------------------------------------------------------------------------

export const orgs = pgTable(
  "org",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    // Company-wide (not per-project) — whether /cost-setup's defaults are
    // fully filled in. Gates final calculations/report export app-wide.
    costSetupComplete: boolean("cost_setup_complete").notNull().default(false),
    // Step 25 — hard ceiling on AI spend (takeoff extraction calls) per
    // calendar month. Same value for every org today (no admin UI to set
    // this per-org yet); the column is per-org so that UI can be added
    // later without a schema change. See lib/ai-limits.ts.
    aiMonthlySpendCapUsd: numeric("ai_monthly_spend_cap_usd", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("20.00"),
    // Step 31 — seat-based billing, tied to the org (see docs/DECISIONS.md
    // and lib/billing.ts for why seat-based rather than usage-based: the
    // product wedge is a team workspace — estimating + reconciliation used
    // by a company's estimators together — not a metered API, and the one
    // genuinely usage-sensitive cost in this app (AI takeoff calls) already
    // has its own hard spend cap from step 25 rather than being the
    // billing axis itself).
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    subscriptionStatus: subscriptionStatusEnum("subscription_status")
      .notNull()
      .default("none"),
    // When the current billing period ends — null until a subscription has
    // actually started. Kept in sync from Stripe webhook events
    // (app/api/webhooks/stripe), not computed locally; Stripe is the
    // source of truth for anything billing-period-shaped.
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    // The known adjacent gap docs/ALERTING.md flagged: hitting the AI
    // spend cap has the same practical effect on a bid deadline as an
    // outage, but nothing notified the org. Null until the cap is first
    // hit in a given month; lib/email/spend-cap-alert.ts compares this
    // against the start of the current month to decide whether an alert
    // is still due, and sets it right after sending — so a contractor
    // hammering the upload button post-cap gets emailed once, not once
    // per attempt.
    aiSpendCapAlertSentAt: timestamp("ai_spend_cap_alert_sent_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // org has no org_id column — a caller may only see/touch their own org row.
  (table) => [orgIsolationPolicy("org", table.id)],
).enableRLS()

export const orgsRelations = relations(orgs, ({ many }) => ({
  users: many(users),
  projects: many(projects),
  costItems: many(costItems),
}))

// ---------------------------------------------------------------------------
// user — org membership + role. The row id is the Supabase auth user id
// (auth.users.id), not a locally generated one; this table is the
// org/role profile layered on top of Supabase's own user record.
// ---------------------------------------------------------------------------

export const users = pgTable(
  "user",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").notNull().default("estimator"),
    fullName: text("full_name"),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("user_org_id_idx").on(table.orgId),
    orgIsolationPolicy("user", table.orgId),
  ],
).enableRLS()

export const usersRelations = relations(users, ({ one }) => ({
  org: one(orgs, { fields: [users.orgId], references: [orgs.id] }),
}))

// ---------------------------------------------------------------------------
// invite — step 32. An org admin invites a teammate by email + role.
// Sending is Supabase Auth's own admin.inviteUserByEmail (see
// app/team/actions.ts) — it creates the auth.users row and emails the
// link; this table exists for the admin-facing bookkeeping
// (list/revoke pending invites, prevent duplicate outstanding invites)
// and to carry orgId/role through to the signup trigger. The actual
// org-join decision on signup reads orgId/role/inviteId out of the new
// auth.users row's raw_user_meta_data (set via inviteUserByEmail's `data`
// option), not by querying this table — see migration 0008's updated
// handle_new_user(). "expired" isn't a stored status: Supabase's own
// invite link expires on its own (dashboard-configurable), and the UI
// just treats an old-enough pending row as stale rather than this app
// tracking a second expiry independently.
// ---------------------------------------------------------------------------

export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "revoked",
])

export const invites = pgTable(
  "invite",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: userRoleEnum("role").notNull().default("estimator"),
    status: inviteStatusEnum("status").notNull().default("pending"),
    invitedBy: uuid("invited_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("invite_org_id_idx").on(table.orgId),
    index("invite_email_idx").on(table.email),
    orgIsolationPolicy("invite", table.orgId),
  ],
).enableRLS()

export const invitesRelations = relations(invites, ({ one }) => ({
  org: one(orgs, { fields: [invites.orgId], references: [orgs.id] }),
  invitedByUser: one(users, {
    fields: [invites.invitedBy],
    references: [users.id],
  }),
}))

// ---------------------------------------------------------------------------
// project — bid metadata (lib/mock-data.ts DashboardProject / ProjectsListItem)
// ---------------------------------------------------------------------------

export const projects = pgTable(
  "project",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    number: text("number").notNull(),
    owner: text("owner").notNull(),
    projectType: text("project_type"),
    location: text("location"),
    status: projectStatusEnum("status").notNull().default("draft"),
    bidDate: date("bid_date"),
    bidTime: text("bid_time"),
    engineersEstimate: numeric("engineers_estimate", {
      precision: 14,
      scale: 2,
    }),
    prevailingWage: boolean("prevailing_wage").notNull().default(false),
    workingDays: integer("working_days"),
    liquidatedDamagesPerDay: numeric("liquidated_damages_per_day", {
      precision: 12,
      scale: 2,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("project_org_id_idx").on(table.orgId),
    index("project_org_id_status_idx").on(table.orgId, table.status),
    orgIsolationPolicy("project", table.orgId),
  ],
).enableRLS()

export const projectsRelations = relations(projects, ({ one, many }) => ({
  org: one(orgs, { fields: [projects.orgId], references: [orgs.id] }),
  documents: many(documents),
  bids: many(bids),
  subQuotes: many(subQuotes),
  estimates: many(estimates),
  reconciliationItems: many(reconciliationItems),
}))

// ---------------------------------------------------------------------------
// document — uploaded bid documents, stored in Supabase Storage
// ---------------------------------------------------------------------------

export const documents = pgTable(
  "document",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: documentTypeEnum("type").notNull(),
    fileName: text("file_name").notNull(),
    storageBucket: text("storage_bucket").notNull(),
    storagePath: text("storage_path").notNull(),
    mimeType: text("mime_type"),
    fileSizeBytes: integer("file_size_bytes"),
    pageCount: integer("page_count"),
    status: documentStatusEnum("status").notNull().default("uploaded"),
    uploadedBy: uuid("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("document_org_id_idx").on(table.orgId),
    index("document_project_id_idx").on(table.projectId),
    orgIsolationPolicy("document", table.orgId),
  ],
).enableRLS()

export const documentsRelations = relations(documents, ({ one, many }) => ({
  org: one(orgs, { fields: [documents.orgId], references: [orgs.id] }),
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  uploadedByUser: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
  takeoffJobs: many(takeoffJobs),
}))

// ---------------------------------------------------------------------------
// takeoff_job — background AI-takeoff processing queue (step 17). Written by
// the Next.js app (one row per uploaded document, queued on upload), read
// and updated by the standalone worker in worker/. The worker connects with
// the same privileged, non-RLS-scoped DATABASE_URL as lib/db/client.ts — it
// has to service every org's queued jobs, not one caller's — so correctness
// here depends on the worker only ever touching a job's own org_id, not on
// RLS restricting it (same trust model as the app's own backend connection).
// ---------------------------------------------------------------------------

export const takeoffJobs = pgTable(
  "takeoff_job",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    status: takeoffJobStatusEnum("status").notNull().default("queued"),
    // Populated by the worker on completion. Which fields are set depends on
    // the source document's type (step 40): a plan set goes through
    // worker/src/extract.ts and lands in `items`, a bid form goes through
    // worker/src/extract-bid-form.ts and lands in `bidItems`. Only `items`
    // feeds generateEstimateFromTakeoff (app/estimate/actions.ts) — bid
    // items are the official side of a reconciliation, not the
    // contractor's own estimate. `kind` is optional because rows written
    // before step 40 predate it; absent means plan takeoff.
    result: jsonb("result").$type<{
      kind?: "plan_takeoff" | "bid_form" | "sub_quote" | "plan_holders"
      items?: ExtractedTakeoffItem[]
      bidItems?: ExtractedBidItem[]
      // Step 41 — set only for kind "sub_quote". Stays raw here until a
      // human confirms it in the review UI, which is what materializes it
      // into quote_condition rows; nothing downstream reads a condition
      // out of this jsonb.
      conditions?: ExtractedQuoteCondition[]
      // Set only for kind "plan_holders", and raw here on the same terms as
      // conditions above: materialized into plan_holder_contact rows on
      // first read of the review screen, and never read out of this jsonb
      // by anything downstream.
      planHolders?: ExtractedPlanHolder[]
      /** Printed on the roster when it prints one, ISO yyyy-mm-dd. */
      planHoldersIssuedOn?: string
      quoteTotalAmount?: number
      documentNotes?: string
    }>(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("takeoff_job_org_id_idx").on(table.orgId),
    index("takeoff_job_document_id_idx").on(table.documentId),
    // The worker's claim query filters on this — see worker/src/poll.ts.
    index("takeoff_job_status_idx").on(table.status),
    orgIsolationPolicy("takeoff_job", table.orgId),
  ],
).enableRLS()

// ---------------------------------------------------------------------------
// ai_usage_event — step 25. One row per real AI call (currently just
// worker/src/extract.ts's takeoff extraction). Written by the worker with
// the token counts Claude's own response reports, converted to an estimated
// dollar cost — see lib/ai-limits.ts / worker/src/ai-limits.ts for the
// pricing constant and monthly-sum query both sides share the shape of.
// Append-only log (never updated/deleted) so monthly spend is always an
// honest sum of what actually happened, not a mutable running counter that
// could drift.
// ---------------------------------------------------------------------------

export const aiUsageEvents = pgTable(
  "ai_usage_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    estimatedCostUsd: numeric("estimated_cost_usd", { precision: 10, scale: 4 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ai_usage_event_org_id_idx").on(table.orgId),
    // The monthly-spend query filters org_id + a createdAt range — this
    // composite index covers that directly instead of falling back to the
    // org_id index plus a row-by-row filter.
    index("ai_usage_event_org_id_created_at_idx").on(table.orgId, table.createdAt),
    orgIsolationPolicy("ai_usage_event", table.orgId),
  ],
).enableRLS()

export const aiUsageEventsRelations = relations(aiUsageEvents, ({ one }) => ({
  org: one(orgs, { fields: [aiUsageEvents.orgId], references: [orgs.id] }),
}))

export const takeoffJobsRelations = relations(takeoffJobs, ({ one }) => ({
  org: one(orgs, { fields: [takeoffJobs.orgId], references: [orgs.id] }),
  document: one(documents, {
    fields: [takeoffJobs.documentId],
    references: [documents.id],
  }),
}))

// ---------------------------------------------------------------------------
// worker_heartbeat — step 29. A single row the worker (worker/src/poll.ts)
// upserts on every poll cycle, so app/api/health can tell "worker process
// is alive and polling" apart from "worker is down" without the worker
// needing to expose any port of its own (deliberately not done — see
// worker/README.md's "No public port needed"). Not tenant data — there's
// no org_id, and no RLS: every caller of the health check needs to see
// this regardless of org, which is the opposite of what org isolation is
// for. This is the one intentional exception; see lib/db/system.ts for the
// (also intentionally narrow) read path.
// ---------------------------------------------------------------------------

export const workerHeartbeats = pgTable("worker_heartbeat", {
  // Fixed singleton id — always upserted onto this one row, never inserted
  // fresh, so there's exactly one heartbeat per worker deployment rather
  // than an ever-growing table.
  id: text("id").primaryKey().default("worker"),
  lastPolledAt: timestamp("last_polled_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ---------------------------------------------------------------------------
// cost_item — company default rates (lib/cost-setup-data.ts)
// One table covers labor rates, equipment rates, and markup/margin fields;
// `category` picks out which of the below columns apply to a given row:
//   labor:    baseRate, fringeRate
//   equipment: rate, rateUnit, ownership
//   margin:   percentValue, helperText, requiredWhenIncomplete
// ---------------------------------------------------------------------------

export const costItems = pgTable(
  "cost_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    category: costItemCategoryEnum("category").notNull(),
    label: text("label").notNull(),
    // labor
    baseRate: numeric("base_rate", { precision: 10, scale: 2 }),
    fringeRate: numeric("fringe_rate", { precision: 10, scale: 2 }),
    // equipment
    rate: numeric("rate", { precision: 10, scale: 2 }),
    rateUnit: text("rate_unit"),
    ownership: equipmentOwnershipEnum("ownership"),
    // margin
    percentValue: numeric("percent_value", { precision: 6, scale: 3 }),
    helperText: text("helper_text"),
    requiredWhenIncomplete: boolean("required_when_incomplete")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("cost_item_org_id_idx").on(table.orgId),
    index("cost_item_org_id_category_idx").on(table.orgId, table.category),
    orgIsolationPolicy("cost_item", table.orgId),
  ],
).enableRLS()

export const costItemsRelations = relations(costItems, ({ one }) => ({
  org: one(orgs, { fields: [costItems.orgId], references: [orgs.id] }),
}))

// ---------------------------------------------------------------------------
// bid — official bid form line items (lib/reconciliation-data.ts officialQty)
// ---------------------------------------------------------------------------

export const bids = pgTable(
  "bid",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    documentId: uuid("document_id").references(() => documents.id, {
      onDelete: "set null",
    }),
    itemNumber: text("item_number").notNull(),
    description: text("description").notNull(),
    unit: text("unit").notNull(),
    officialQuantity: numeric("official_quantity", {
      precision: 14,
      scale: 2,
    }).notNull(),
    specSection: text("spec_section"),
    extractionConfidence: numeric("extraction_confidence", {
      precision: 5,
      scale: 2,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("bid_org_id_idx").on(table.orgId),
    index("bid_project_id_idx").on(table.projectId),
    orgIsolationPolicy("bid", table.orgId),
  ],
).enableRLS()

export const bidsRelations = relations(bids, ({ one, many }) => ({
  org: one(orgs, { fields: [bids.orgId], references: [orgs.id] }),
  project: one(projects, {
    fields: [bids.projectId],
    references: [projects.id],
  }),
  document: one(documents, {
    fields: [bids.documentId],
    references: [documents.id],
  }),
  reconciliationItems: many(reconciliationItems),
}))

// ---------------------------------------------------------------------------
// sub_quote — step 41. One quote a subcontractor sent the prime for one
// trade on this project. The uploaded file itself is a `document` row (type
// "sub_quote") like every other upload, so it reuses the whole existing
// pipeline — storage-path org check, spend cap, rate limit, retry. This
// table is the quote-specific metadata that has nowhere to live on
// `document`: who sent it, for what trade, and how far through review it is.
//
// subName/trade are entered by the uploader rather than read off the
// document. The AI can usually find both, but a wrong sub name silently
// attributed to the wrong company is a worse failure than a required field.
// ---------------------------------------------------------------------------

export const subQuotes = pgTable(
  "sub_quote",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    subName: text("sub_name").notNull(),
    trade: text("trade").notNull(),
    // The quote's bottom-line number. Nullable because plenty of real
    // quotes price per item with no total printed anywhere, and because a
    // handwritten total is exactly the figure we refuse to accept without
    // someone confirming it (see totalAmountConfirmed).
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }),
    totalAmountConfirmed: boolean("total_amount_confirmed")
      .notNull()
      .default(false),
    status: subQuoteStatusEnum("status").notNull().default("uploaded"),
    uploadedBy: uuid("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("sub_quote_org_id_idx").on(table.orgId),
    index("sub_quote_project_id_idx").on(table.projectId),
    // The comparison grid is built one trade at a time — this covers the
    // "every quote for this project's paving package" read directly.
    index("sub_quote_project_id_trade_idx").on(table.projectId, table.trade),
    index("sub_quote_document_id_idx").on(table.documentId),
    orgIsolationPolicy("sub_quote", table.orgId),
  ],
).enableRLS()

export const subQuotesRelations = relations(subQuotes, ({ one, many }) => ({
  org: one(orgs, { fields: [subQuotes.orgId], references: [orgs.id] }),
  project: one(projects, {
    fields: [subQuotes.projectId],
    references: [projects.id],
  }),
  document: one(documents, {
    fields: [subQuotes.documentId],
    references: [documents.id],
  }),
  uploadedByUser: one(users, {
    fields: [subQuotes.uploadedBy],
    references: [users.id],
  }),
  conditions: many(quoteConditions),
  lineItems: many(quoteLineItems),
}))

// ---------------------------------------------------------------------------
// quote_condition — step 41. One condition the AI read off one sub quote.
//
// rawText is the load-bearing column, not a debugging nicety: it's the
// verbatim sentence the condition came from, and it's what the review UI
// highlights so an estimator can confirm a condition in three seconds
// instead of hunting through a PDF. Without it the review step is slow
// enough that people skip it, which is the failure mode the whole review
// gate exists to prevent. Nothing here is trusted until isConfirmed.
//
// Deliberately no "absent" rows: a condition the quote doesn't mention
// produces no row at all. Not-stated and excluded are different facts — a
// sub who never mentions traffic control has not excluded it — and the
// comparison grid has to be able to tell them apart, which it can't if the
// extractor is allowed to write rows for things it didn't find.
// ---------------------------------------------------------------------------

export const quoteConditions = pgTable(
  "quote_condition",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    subQuoteId: uuid("sub_quote_id")
      .notNull()
      .references(() => subQuotes.id, { onDelete: "cascade" }),
    category: quoteConditionCategoryEnum("category").notNull(),
    // Verbatim from the quote — never normalized, never re-worded.
    rawText: text("raw_text").notNull(),
    // The AI's reading of what rawText means in comparable terms (e.g. "2
    // mobilizations included, $1,850 each"). Nullable: some conditions
    // don't reduce to anything more useful than their own wording.
    normalizedValue: text("normalized_value"),
    sourcePage: integer("source_page"),
    // [x0, y0, x1, y1] as fractions of the page, so the review UI can
    // highlight the source text without knowing the render resolution.
    boundingBox: jsonb("bounding_box").$type<[number, number, number, number]>(),
    // 0-100, matching bid.extraction_confidence rather than a 0-1 scale.
    confidence: numeric("confidence", { precision: 5, scale: 2 }),
    // Why this row was surfaced to a human first. Null means it wasn't
    // flagged — it still needs confirming, just not urgently.
    flagReason: text("flag_reason"),
    // What it costs the prime to cover this exclusion themselves, entered by
    // hand on the comparison grid (step 42). Only meaningful on a condition
    // the sub excluded: it is what turns a set of unlike quotes into
    // comparable numbers, since the cheapest base price stops being cheapest
    // once the work it left out is priced back in. Null means "not yet
    // costed", which is deliberately different from zero ("costed at nothing")
    // — the grid says so rather than treating an unpriced exclusion as free.
    primeCostUsd: numeric("prime_cost_usd", { precision: 14, scale: 2 }),
    isConfirmed: boolean("is_confirmed").notNull().default(false),
    confirmedBy: uuid("confirmed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("quote_condition_org_id_idx").on(table.orgId),
    index("quote_condition_sub_quote_id_idx").on(table.subQuoteId),
    // The grid reads a whole trade's conditions and buckets them by
    // category; this covers that without a per-row filter.
    index("quote_condition_sub_quote_id_category_idx").on(
      table.subQuoteId,
      table.category,
    ),
    orgIsolationPolicy("quote_condition", table.orgId),
  ],
).enableRLS()

export const quoteConditionsRelations = relations(quoteConditions, ({ one }) => ({
  org: one(orgs, { fields: [quoteConditions.orgId], references: [orgs.id] }),
  subQuote: one(subQuotes, {
    fields: [quoteConditions.subQuoteId],
    references: [subQuotes.id],
  }),
  confirmedByUser: one(users, {
    fields: [quoteConditions.confirmedBy],
    references: [users.id],
  }),
}))

// ---------------------------------------------------------------------------
// quote_line_item — step 41. A priced line off a sub quote.
//
// Written now, populated later: the conditions grid ships first, and true
// line-by-line leveling is a later phase. `bidId` is the column that makes
// that phase possible — mapping a sub's line onto the project's own bid
// schedule is what lets several subs' quotes be compared row-for-row rather
// than only condition-for-condition. It stays null until then, and null is
// also the permanent answer for a line that has no counterpart on the form.
//
// isConfirmed carries the same meaning as on quote_condition, and matters
// more here: these are the numbers that reach a bid tab. A handwritten
// figure never counts as confirmed without someone clicking it.
// ---------------------------------------------------------------------------

export const quoteLineItems = pgTable(
  "quote_line_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    subQuoteId: uuid("sub_quote_id")
      .notNull()
      .references(() => subQuotes.id, { onDelete: "cascade" }),
    bidId: uuid("bid_id").references(() => bids.id, { onDelete: "set null" }),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 2 }),
    unit: text("unit"),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }),
    extendedPrice: numeric("extended_price", { precision: 14, scale: 2 }),
    sourcePage: integer("source_page"),
    // True when this line's numbers were read off handwriting. Drives the
    // mandatory crop-and-confirm step — see docs for step 41. Kept as its
    // own column rather than inferred from low confidence: a neatly written
    // number can be read with high confidence and still must be confirmed.
    isHandwritten: boolean("is_handwritten").notNull().default(false),
    confidence: numeric("confidence", { precision: 5, scale: 2 }),
    isConfirmed: boolean("is_confirmed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("quote_line_item_org_id_idx").on(table.orgId),
    index("quote_line_item_sub_quote_id_idx").on(table.subQuoteId),
    index("quote_line_item_bid_id_idx").on(table.bidId),
    orgIsolationPolicy("quote_line_item", table.orgId),
  ],
).enableRLS()

export const quoteLineItemsRelations = relations(quoteLineItems, ({ one }) => ({
  org: one(orgs, { fields: [quoteLineItems.orgId], references: [orgs.id] }),
  subQuote: one(subQuotes, {
    fields: [quoteLineItems.subQuoteId],
    references: [subQuotes.id],
  }),
  bid: one(bids, { fields: [quoteLineItems.bidId], references: [bids.id] }),
}))

// ---------------------------------------------------------------------------
// plan_holder_list — one plan holders roster an agency published for one
// project. The uploaded file is a `document` row (type "plan_holders") like
// every other upload, so it reuses the whole pipeline: storage-path org
// check, spend cap, rate limit, retry. This table is the list-specific
// metadata that has nowhere to live on `document`.
//
// One list per document, and a project can hold several — agencies reissue
// the roster as more bidders pull documents, and the last one before bid day
// is the one that matters. sourceLabel is how a human tells them apart
// ("Addendum 2 plan holders, 3/14"), entered by the uploader rather than
// read off the document: a roster's own dating is wildly inconsistent and a
// list silently attributed to the wrong issue is worse than a required field.
// ---------------------------------------------------------------------------

export const planHolderLists = pgTable(
  "plan_holder_list",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    sourceLabel: text("source_label").notNull(),
    // The date the agency printed on the roster, when it printed one. Read
    // off the document, so nullable — plenty of lists carry no date at all.
    issuedOn: timestamp("issued_on", { withTimezone: true }),
    status: planHolderListStatusEnum("status").notNull().default("uploaded"),
    // Whatever the extractor wants a reviewer to know about the document as
    // a whole — including "this isn't a plan holders list".
    documentNotes: text("document_notes"),
    uploadedBy: uuid("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("plan_holder_list_org_id_idx").on(table.orgId),
    index("plan_holder_list_project_id_idx").on(table.projectId),
    index("plan_holder_list_document_id_idx").on(table.documentId),
    orgIsolationPolicy("plan_holder_list", table.orgId),
  ],
).enableRLS()

export const planHolderListsRelations = relations(
  planHolderLists,
  ({ one, many }) => ({
    org: one(orgs, { fields: [planHolderLists.orgId], references: [orgs.id] }),
    project: one(projects, {
      fields: [planHolderLists.projectId],
      references: [projects.id],
    }),
    document: one(documents, {
      fields: [planHolderLists.documentId],
      references: [documents.id],
    }),
    uploadedByUser: one(users, {
      fields: [planHolderLists.uploadedBy],
      references: [users.id],
    }),
    contacts: many(planHolderContacts),
  }),
)

// ---------------------------------------------------------------------------
// plan_holder_contact — one row off one plan holders list.
//
// rawText is load-bearing for the same reason it is on quote_condition: it's
// the verbatim roster line the row came from, and it's what the review screen
// shows beside the parsed fields so an estimator can confirm at a glance.
// Plan holder rosters are the worst-formatted documents an agency publishes
// — company, contact, address, phone and licence run together in one cell as
// often as not — so the parse is the part most likely to be wrong, and the
// source line is what makes checking it cheap.
//
// contractorId is nullable and has no foreign key, deliberately: there is no
// contractors table to reference yet. See planHolderMatchStatusEnum for why,
// and for what has to exist before matchStatus can be anything but
// "unmatched". Adding the reference later is a migration on this column
// alone — the rows, and the extraction that produced them, stay put.
// ---------------------------------------------------------------------------

export const planHolderContacts = pgTable(
  "plan_holder_contact",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    planHolderListId: uuid("plan_holder_list_id")
      .notNull()
      .references(() => planHolderLists.id, { onDelete: "cascade" }),
    // Verbatim from the roster — never normalized, never re-worded.
    rawText: text("raw_text").notNull(),
    companyName: text("company_name").notNull(),
    contactName: text("contact_name"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    // As printed on the roster, not normalized: CSLB numbers appear as
    // "1044821", "Lic. 1044821", "C-12 1044821" and worse, and which part is
    // the number is exactly the judgement the matcher will need to make.
    licenseNumber: text("license_number"),
    // 0-100, matching quote_condition.confidence and bid.extraction_confidence
    // rather than a 0-1 scale.
    confidence: numeric("confidence", { precision: 5, scale: 2 }),
    notes: text("notes"),
    sourcePage: integer("source_page"),
    // --- registry seam. Inert until a contractors table exists. ---
    matchStatus: planHolderMatchStatusEnum("match_status")
      .notNull()
      .default("unmatched"),
    contractorId: uuid("contractor_id"),
    // 0-100 confidence in the registry match specifically — a different
    // question from `confidence` above, which is about the transcription.
    matchConfidence: numeric("match_confidence", { precision: 5, scale: 2 }),
    // --- end registry seam ---
    isConfirmed: boolean("is_confirmed").notNull().default(false),
    confirmedBy: uuid("confirmed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("plan_holder_contact_org_id_idx").on(table.orgId),
    index("plan_holder_contact_list_id_idx").on(table.planHolderListId),
    // The review screen reads one list and sorts unconfirmed rows first;
    // this covers that without a per-row filter.
    index("plan_holder_contact_list_id_confirmed_idx").on(
      table.planHolderListId,
      table.isConfirmed,
    ),
    // For the backfill that will resolve these against the registry: find
    // every row still waiting on a match, across lists.
    index("plan_holder_contact_match_status_idx").on(table.matchStatus),
    orgIsolationPolicy("plan_holder_contact", table.orgId),
  ],
).enableRLS()

export const planHolderContactsRelations = relations(
  planHolderContacts,
  ({ one }) => ({
    org: one(orgs, {
      fields: [planHolderContacts.orgId],
      references: [orgs.id],
    }),
    planHolderList: one(planHolderLists, {
      fields: [planHolderContacts.planHolderListId],
      references: [planHolderLists.id],
    }),
    confirmedByUser: one(users, {
      fields: [planHolderContacts.confirmedBy],
      references: [users.id],
    }),
  }),
)

// ---------------------------------------------------------------------------
// estimate / estimate_line (lib/estimate-data.ts)
// ---------------------------------------------------------------------------

export const estimates = pgTable(
  "estimate",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // The date company cost_item rates were snapshotted/frozen into this
    // estimate's line items — so editing company rates later never silently
    // changes an estimate that's already been submitted or is under review.
    rateSnapshotDate: date("rate_snapshot_date").notNull(),
    // Whether a company rate has changed since rateSnapshotDate. Cleared
    // (and driftDismissed reset) whenever the snapshot is recalculated.
    rateDrift: boolean("rate_drift").notNull().default(false),
    // User dismissed the drift banner via "Keep Snapshot" without recalculating.
    driftDismissed: boolean("drift_dismissed").notNull().default(false),
    // Whether this estimate has ever been recalculated against current rates.
    recalculated: boolean("recalculated").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("estimate_org_id_idx").on(table.orgId),
    index("estimate_project_id_idx").on(table.projectId),
    orgIsolationPolicy("estimate", table.orgId),
  ],
).enableRLS()

export const estimatesRelations = relations(estimates, ({ one, many }) => ({
  org: one(orgs, { fields: [estimates.orgId], references: [orgs.id] }),
  project: one(projects, {
    fields: [estimates.projectId],
    references: [projects.id],
  }),
  lines: many(estimateLines),
}))

export const estimateLines = pgTable(
  "estimate_line",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    estimateId: uuid("estimate_id")
      .notNull()
      .references(() => estimates.id, { onDelete: "cascade" }),
    bidId: uuid("bid_id").references(() => bids.id, { onDelete: "set null" }),
    lineNumber: integer("line_number").notNull(),
    description: text("description").notNull(),
    note: text("note"),
    quantity: numeric("quantity", { precision: 14, scale: 2 }).notNull(),
    unit: text("unit").notNull(),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),
    laborCost: numeric("labor_cost", { precision: 14, scale: 2 }),
    materialCost: numeric("material_cost", { precision: 14, scale: 2 }),
    equipmentCost: numeric("equipment_cost", { precision: 14, scale: 2 }),
    subCost: numeric("sub_cost", { precision: 14, scale: 2 }),
    markupPct: numeric("markup_pct", { precision: 6, scale: 3 })
      .notNull()
      .default("10"),
    total: numeric("total", { precision: 14, scale: 2 }).notNull(),
    source: sourceKindEnum("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("estimate_line_org_id_idx").on(table.orgId),
    index("estimate_line_estimate_id_idx").on(table.estimateId),
    orgIsolationPolicy("estimate_line", table.orgId),
  ],
).enableRLS()

export const estimateLinesRelations = relations(estimateLines, ({ one }) => ({
  org: one(orgs, { fields: [estimateLines.orgId], references: [orgs.id] }),
  estimate: one(estimates, {
    fields: [estimateLines.estimateId],
    references: [estimates.id],
  }),
  bid: one(bids, { fields: [estimateLines.bidId], references: [bids.id] }),
}))

// ---------------------------------------------------------------------------
// reconciliation_item (lib/reconciliation-data.ts)
// One row per bid-form line item, comparing the official quantity against
// the AI-extracted reading and the contractor's estimate line.
// ---------------------------------------------------------------------------

export const reconciliationItems = pgTable(
  "reconciliation_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    bidId: uuid("bid_id")
      .notNull()
      .references(() => bids.id, { onDelete: "cascade" }),
    // Null when the official bid item has no corresponding estimate line yet
    // (the "MISSING FROM ESTIMATE" case).
    estimateLineId: uuid("estimate_line_id").references(
      () => estimateLines.id,
      { onDelete: "set null" },
    ),
    aiQuantity: numeric("ai_quantity", { precision: 14, scale: 2 }),
    // diff/diffPct are snapshotted as of the last reconciliation run, not
    // recomputed live — they reflect what the contractor saw at that time.
    diffQuantity: numeric("diff_quantity", { precision: 14, scale: 2 }),
    diffPct: numeric("diff_pct", { precision: 6, scale: 2 }),
    confidence: numeric("confidence", { precision: 5, scale: 2 }),
    planSheets: text("plan_sheets"),
    statusLabel: text("status_label").notNull(),
    statusColor: reconciliationStatusColorEnum("status_color").notNull(),
    attention: boolean("attention").notNull().default(false),
    filters: reconciliationFilterEnum("filters").array().notNull().default([]),
    explanation: text("explanation"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("reconciliation_item_org_id_idx").on(table.orgId),
    index("reconciliation_item_project_id_idx").on(table.projectId),
    index("reconciliation_item_bid_id_idx").on(table.bidId),
    orgIsolationPolicy("reconciliation_item", table.orgId),
  ],
).enableRLS()

export const reconciliationItemsRelations = relations(
  reconciliationItems,
  ({ one }) => ({
    org: one(orgs, {
      fields: [reconciliationItems.orgId],
      references: [orgs.id],
    }),
    project: one(projects, {
      fields: [reconciliationItems.projectId],
      references: [projects.id],
    }),
    bid: one(bids, {
      fields: [reconciliationItems.bidId],
      references: [bids.id],
    }),
    estimateLine: one(estimateLines, {
      fields: [reconciliationItems.estimateLineId],
      references: [estimateLines.id],
    }),
  }),
)

// ---------------------------------------------------------------------------
// review_request — "Request Human Review" (components/review). Just the
// request itself: what scope was asked for, notes, and status. There's no
// reviewer pool/marketplace to assign to yet (this project has no reviewer
// role or matching logic) — status starts at "requested" and is expected to
// be moved along manually for now rather than automatically.
// ---------------------------------------------------------------------------

export const reviewRequests = pgTable(
  "review_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    requestedBy: uuid("requested_by").references(() => users.id, {
      onDelete: "set null",
    }),
    scope: reviewScopeEnum("scope").array().notNull().default([]),
    notes: text("notes"),
    status: reviewRequestStatusEnum("status").notNull().default("requested"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("review_request_org_id_idx").on(table.orgId),
    index("review_request_project_id_idx").on(table.projectId),
    orgIsolationPolicy("review_request", table.orgId),
  ],
).enableRLS()

export const reviewRequestsRelations = relations(reviewRequests, ({ one }) => ({
  org: one(orgs, { fields: [reviewRequests.orgId], references: [orgs.id] }),
  project: one(projects, {
    fields: [reviewRequests.projectId],
    references: [projects.id],
  }),
  requestedByUser: one(users, {
    fields: [reviewRequests.requestedBy],
    references: [users.id],
  }),
}))
