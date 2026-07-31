import { relations, sql } from "drizzle-orm"
import {
  type AnyPgColumn,
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgPolicy,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

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
  "other",
])

export const documentStatusEnum = pgEnum("document_status", [
  "uploaded",
  "processing",
  "processed",
  "failed",
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

// ---------------------------------------------------------------------------
// org
// ---------------------------------------------------------------------------

export const orgs = pgTable(
  "org",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
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

export const documentsRelations = relations(documents, ({ one }) => ({
  org: one(orgs, { fields: [documents.orgId], references: [orgs.id] }),
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  uploadedByUser: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
}))

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
