CREATE TYPE "public"."cost_item_category" AS ENUM('labor', 'equipment', 'margin');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('uploaded', 'processing', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('plans', 'specifications', 'bid_form', 'addendum', 'other');--> statement-breakpoint
CREATE TYPE "public"."equipment_ownership" AS ENUM('owned', 'rental');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'documents', 'processing', 'ready', 'estimating', 'reconciliation');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_filter" AS ENUM('matched', 'quantity_discrepancy', 'low_confidence', 'missing', 'lump_sum', 'unit_converted');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_status_color" AS ENUM('green', 'amber', 'yellow', 'red');--> statement-breakpoint
CREATE TYPE "public"."source_kind" AS ENUM('official', 'ai_extracted', 'manual', 'reviewed', 'overridden');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'estimator', 'pm', 'viewer');--> statement-breakpoint
CREATE TABLE "bid" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"document_id" uuid,
	"item_number" text NOT NULL,
	"description" text NOT NULL,
	"unit" text NOT NULL,
	"official_quantity" numeric(14, 2) NOT NULL,
	"spec_section" text,
	"extraction_confidence" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bid" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cost_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"category" "cost_item_category" NOT NULL,
	"label" text NOT NULL,
	"base_rate" numeric(10, 2),
	"fringe_rate" numeric(10, 2),
	"rate" numeric(10, 2),
	"rate_unit" text,
	"ownership" "equipment_ownership",
	"percent_value" numeric(6, 3),
	"helper_text" text,
	"required_when_incomplete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cost_item" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"type" "document_type" NOT NULL,
	"file_name" text NOT NULL,
	"storage_bucket" text NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" text,
	"file_size_bytes" integer,
	"page_count" integer,
	"status" "document_status" DEFAULT 'uploaded' NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "estimate_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"estimate_id" uuid NOT NULL,
	"bid_id" uuid,
	"line_number" integer NOT NULL,
	"description" text NOT NULL,
	"note" text,
	"quantity" numeric(14, 2) NOT NULL,
	"unit" text NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"labor_cost" numeric(14, 2),
	"material_cost" numeric(14, 2),
	"equipment_cost" numeric(14, 2),
	"sub_cost" numeric(14, 2),
	"markup_pct" numeric(6, 3) DEFAULT '10' NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"source" "source_kind" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "estimate_line" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "estimate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"rate_snapshot_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "estimate" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "org" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "org" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"number" text NOT NULL,
	"owner" text NOT NULL,
	"project_type" text,
	"location" text,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"bid_date" date,
	"bid_time" text,
	"engineers_estimate" numeric(14, 2),
	"prevailing_wage" boolean DEFAULT false NOT NULL,
	"working_days" integer,
	"liquidated_damages_per_day" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reconciliation_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"bid_id" uuid NOT NULL,
	"estimate_line_id" uuid,
	"ai_quantity" numeric(14, 2),
	"diff_quantity" numeric(14, 2),
	"diff_pct" numeric(6, 2),
	"confidence" numeric(5, 2),
	"plan_sheets" text,
	"status_label" text NOT NULL,
	"status_color" "reconciliation_status_color" NOT NULL,
	"attention" boolean DEFAULT false NOT NULL,
	"filters" "reconciliation_filter"[] DEFAULT '{}' NOT NULL,
	"explanation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reconciliation_item" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"role" "user_role" DEFAULT 'estimator' NOT NULL,
	"full_name" text,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bid" ADD CONSTRAINT "bid_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid" ADD CONSTRAINT "bid_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid" ADD CONSTRAINT "bid_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_item" ADD CONSTRAINT "cost_item_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate_line" ADD CONSTRAINT "estimate_line_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate_line" ADD CONSTRAINT "estimate_line_estimate_id_estimate_id_fk" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate_line" ADD CONSTRAINT "estimate_line_bid_id_bid_id_fk" FOREIGN KEY ("bid_id") REFERENCES "public"."bid"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_item" ADD CONSTRAINT "reconciliation_item_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_item" ADD CONSTRAINT "reconciliation_item_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_item" ADD CONSTRAINT "reconciliation_item_bid_id_bid_id_fk" FOREIGN KEY ("bid_id") REFERENCES "public"."bid"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_item" ADD CONSTRAINT "reconciliation_item_estimate_line_id_estimate_line_id_fk" FOREIGN KEY ("estimate_line_id") REFERENCES "public"."estimate_line"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Every org-isolation policy below calls this. SECURITY DEFINER so it can
-- read "user" without being subject to that table's own RLS policy — that
-- policy itself calls this function, so a plain (non-definer) subquery here
-- would require the "user" policy to already be resolved to resolve the
-- "user" policy. Postgres can't break that cycle on its own.
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT org_id FROM "user" WHERE id = auth.uid()
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.current_org_id() FROM public;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated;--> statement-breakpoint
CREATE INDEX "bid_org_id_idx" ON "bid" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "bid_project_id_idx" ON "bid" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "cost_item_org_id_idx" ON "cost_item" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "cost_item_org_id_category_idx" ON "cost_item" USING btree ("org_id","category");--> statement-breakpoint
CREATE INDEX "document_org_id_idx" ON "document" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "document_project_id_idx" ON "document" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "estimate_line_org_id_idx" ON "estimate_line" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "estimate_line_estimate_id_idx" ON "estimate_line" USING btree ("estimate_id");--> statement-breakpoint
CREATE INDEX "estimate_org_id_idx" ON "estimate" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "estimate_project_id_idx" ON "estimate" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_org_id_idx" ON "project" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "project_org_id_status_idx" ON "project" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "reconciliation_item_org_id_idx" ON "reconciliation_item" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "reconciliation_item_project_id_idx" ON "reconciliation_item" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "reconciliation_item_bid_id_idx" ON "reconciliation_item" USING btree ("bid_id");--> statement-breakpoint
CREATE INDEX "user_org_id_idx" ON "user" USING btree ("org_id");--> statement-breakpoint
CREATE POLICY "bid_org_isolation" ON "bid" AS PERMISSIVE FOR ALL TO "authenticated" USING ("bid"."org_id" = public.current_org_id()) WITH CHECK ("bid"."org_id" = public.current_org_id());--> statement-breakpoint
CREATE POLICY "cost_item_org_isolation" ON "cost_item" AS PERMISSIVE FOR ALL TO "authenticated" USING ("cost_item"."org_id" = public.current_org_id()) WITH CHECK ("cost_item"."org_id" = public.current_org_id());--> statement-breakpoint
CREATE POLICY "document_org_isolation" ON "document" AS PERMISSIVE FOR ALL TO "authenticated" USING ("document"."org_id" = public.current_org_id()) WITH CHECK ("document"."org_id" = public.current_org_id());--> statement-breakpoint
CREATE POLICY "estimate_line_org_isolation" ON "estimate_line" AS PERMISSIVE FOR ALL TO "authenticated" USING ("estimate_line"."org_id" = public.current_org_id()) WITH CHECK ("estimate_line"."org_id" = public.current_org_id());--> statement-breakpoint
CREATE POLICY "estimate_org_isolation" ON "estimate" AS PERMISSIVE FOR ALL TO "authenticated" USING ("estimate"."org_id" = public.current_org_id()) WITH CHECK ("estimate"."org_id" = public.current_org_id());--> statement-breakpoint
CREATE POLICY "org_org_isolation" ON "org" AS PERMISSIVE FOR ALL TO "authenticated" USING ("org"."id" = public.current_org_id()) WITH CHECK ("org"."id" = public.current_org_id());--> statement-breakpoint
CREATE POLICY "project_org_isolation" ON "project" AS PERMISSIVE FOR ALL TO "authenticated" USING ("project"."org_id" = public.current_org_id()) WITH CHECK ("project"."org_id" = public.current_org_id());--> statement-breakpoint
CREATE POLICY "reconciliation_item_org_isolation" ON "reconciliation_item" AS PERMISSIVE FOR ALL TO "authenticated" USING ("reconciliation_item"."org_id" = public.current_org_id()) WITH CHECK ("reconciliation_item"."org_id" = public.current_org_id());--> statement-breakpoint
CREATE POLICY "user_org_isolation" ON "user" AS PERMISSIVE FOR ALL TO "authenticated" USING ("user"."org_id" = public.current_org_id()) WITH CHECK ("user"."org_id" = public.current_org_id());