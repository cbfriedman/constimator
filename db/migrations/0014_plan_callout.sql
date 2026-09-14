CREATE TYPE "public"."plan_callout_match_source" AS ENUM('ai', 'description', 'manual');--> statement-breakpoint
CREATE TABLE "plan_callout" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"bid_id" uuid,
	"sheet_number" text NOT NULL,
	"sheet_title" text,
	"page_number" integer,
	"description" text NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"unit" text NOT NULL,
	"source_text" text NOT NULL,
	"source_kind" text NOT NULL,
	"ai_bid_item_number" text,
	"match_source" "plan_callout_match_source",
	"confidence" numeric(5, 2),
	"notes" text,
	"dismissed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_callout" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plan_callout" ADD CONSTRAINT "plan_callout_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_callout" ADD CONSTRAINT "plan_callout_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_callout" ADD CONSTRAINT "plan_callout_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_callout" ADD CONSTRAINT "plan_callout_bid_id_bid_id_fk" FOREIGN KEY ("bid_id") REFERENCES "public"."bid"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_callout_org_id_idx" ON "plan_callout" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "plan_callout_project_id_idx" ON "plan_callout" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "plan_callout_document_id_idx" ON "plan_callout" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "plan_callout_bid_id_idx" ON "plan_callout" USING btree ("bid_id");--> statement-breakpoint
CREATE POLICY "plan_callout_org_isolation" ON "plan_callout" AS PERMISSIVE FOR ALL TO "authenticated" USING ("plan_callout"."org_id" = public.current_org_id()) WITH CHECK ("plan_callout"."org_id" = public.current_org_id());