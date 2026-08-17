CREATE TYPE "public"."quote_condition_category" AS ENUM('exclusion', 'inclusion', 'mobilization', 'pricing_basis', 'minimum_charge', 'quantity_assumption', 'price_validity', 'bond', 'tax', 'prevailing_wage', 'traffic_control', 'work_hours', 'material_supply', 'disposal', 'site_access', 'weather', 'insurance', 'retainage', 'other');--> statement-breakpoint
CREATE TYPE "public"."sub_quote_status" AS ENUM('uploaded', 'extracting', 'needs_review', 'confirmed', 'failed');--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'sub_quote' BEFORE 'other';--> statement-breakpoint
CREATE TABLE "quote_condition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"sub_quote_id" uuid NOT NULL,
	"category" "quote_condition_category" NOT NULL,
	"raw_text" text NOT NULL,
	"normalized_value" text,
	"source_page" integer,
	"bounding_box" jsonb,
	"confidence" numeric(5, 2),
	"flag_reason" text,
	"is_confirmed" boolean DEFAULT false NOT NULL,
	"confirmed_by" uuid,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_condition" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "quote_line_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"sub_quote_id" uuid NOT NULL,
	"bid_id" uuid,
	"description" text NOT NULL,
	"quantity" numeric(14, 2),
	"unit" text,
	"unit_price" numeric(14, 2),
	"extended_price" numeric(14, 2),
	"source_page" integer,
	"is_handwritten" boolean DEFAULT false NOT NULL,
	"confidence" numeric(5, 2),
	"is_confirmed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_line_item" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sub_quote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"sub_name" text NOT NULL,
	"trade" text NOT NULL,
	"total_amount" numeric(14, 2),
	"total_amount_confirmed" boolean DEFAULT false NOT NULL,
	"status" "sub_quote_status" DEFAULT 'uploaded' NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sub_quote" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quote_condition" ADD CONSTRAINT "quote_condition_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_condition" ADD CONSTRAINT "quote_condition_sub_quote_id_sub_quote_id_fk" FOREIGN KEY ("sub_quote_id") REFERENCES "public"."sub_quote"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_condition" ADD CONSTRAINT "quote_condition_confirmed_by_user_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_line_item" ADD CONSTRAINT "quote_line_item_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_line_item" ADD CONSTRAINT "quote_line_item_sub_quote_id_sub_quote_id_fk" FOREIGN KEY ("sub_quote_id") REFERENCES "public"."sub_quote"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_line_item" ADD CONSTRAINT "quote_line_item_bid_id_bid_id_fk" FOREIGN KEY ("bid_id") REFERENCES "public"."bid"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_quote" ADD CONSTRAINT "sub_quote_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_quote" ADD CONSTRAINT "sub_quote_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_quote" ADD CONSTRAINT "sub_quote_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_quote" ADD CONSTRAINT "sub_quote_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quote_condition_org_id_idx" ON "quote_condition" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "quote_condition_sub_quote_id_idx" ON "quote_condition" USING btree ("sub_quote_id");--> statement-breakpoint
CREATE INDEX "quote_condition_sub_quote_id_category_idx" ON "quote_condition" USING btree ("sub_quote_id","category");--> statement-breakpoint
CREATE INDEX "quote_line_item_org_id_idx" ON "quote_line_item" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "quote_line_item_sub_quote_id_idx" ON "quote_line_item" USING btree ("sub_quote_id");--> statement-breakpoint
CREATE INDEX "quote_line_item_bid_id_idx" ON "quote_line_item" USING btree ("bid_id");--> statement-breakpoint
CREATE INDEX "sub_quote_org_id_idx" ON "sub_quote" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "sub_quote_project_id_idx" ON "sub_quote" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "sub_quote_project_id_trade_idx" ON "sub_quote" USING btree ("project_id","trade");--> statement-breakpoint
CREATE INDEX "sub_quote_document_id_idx" ON "sub_quote" USING btree ("document_id");--> statement-breakpoint
CREATE POLICY "quote_condition_org_isolation" ON "quote_condition" AS PERMISSIVE FOR ALL TO "authenticated" USING ("quote_condition"."org_id" = public.current_org_id()) WITH CHECK ("quote_condition"."org_id" = public.current_org_id());--> statement-breakpoint
CREATE POLICY "quote_line_item_org_isolation" ON "quote_line_item" AS PERMISSIVE FOR ALL TO "authenticated" USING ("quote_line_item"."org_id" = public.current_org_id()) WITH CHECK ("quote_line_item"."org_id" = public.current_org_id());--> statement-breakpoint
CREATE POLICY "sub_quote_org_isolation" ON "sub_quote" AS PERMISSIVE FOR ALL TO "authenticated" USING ("sub_quote"."org_id" = public.current_org_id()) WITH CHECK ("sub_quote"."org_id" = public.current_org_id());