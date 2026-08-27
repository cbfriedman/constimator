CREATE TYPE "public"."plan_holder_list_status" AS ENUM('uploaded', 'extracting', 'needs_review', 'confirmed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."plan_holder_match_status" AS ENUM('unmatched', 'matched', 'ambiguous', 'rejected');--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'plan_holders' BEFORE 'other';--> statement-breakpoint
CREATE TABLE "plan_holder_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"plan_holder_list_id" uuid NOT NULL,
	"raw_text" text NOT NULL,
	"company_name" text NOT NULL,
	"contact_name" text,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"license_number" text,
	"confidence" numeric(5, 2),
	"notes" text,
	"source_page" integer,
	"match_status" "plan_holder_match_status" DEFAULT 'unmatched' NOT NULL,
	"contractor_id" uuid,
	"match_confidence" numeric(5, 2),
	"is_confirmed" boolean DEFAULT false NOT NULL,
	"confirmed_by" uuid,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_holder_contact" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "plan_holder_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"source_label" text NOT NULL,
	"issued_on" timestamp with time zone,
	"status" "plan_holder_list_status" DEFAULT 'uploaded' NOT NULL,
	"document_notes" text,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_holder_list" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plan_holder_contact" ADD CONSTRAINT "plan_holder_contact_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_holder_contact" ADD CONSTRAINT "plan_holder_contact_plan_holder_list_id_plan_holder_list_id_fk" FOREIGN KEY ("plan_holder_list_id") REFERENCES "public"."plan_holder_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_holder_contact" ADD CONSTRAINT "plan_holder_contact_confirmed_by_user_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_holder_list" ADD CONSTRAINT "plan_holder_list_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_holder_list" ADD CONSTRAINT "plan_holder_list_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_holder_list" ADD CONSTRAINT "plan_holder_list_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_holder_list" ADD CONSTRAINT "plan_holder_list_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_holder_contact_org_id_idx" ON "plan_holder_contact" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "plan_holder_contact_list_id_idx" ON "plan_holder_contact" USING btree ("plan_holder_list_id");--> statement-breakpoint
CREATE INDEX "plan_holder_contact_list_id_confirmed_idx" ON "plan_holder_contact" USING btree ("plan_holder_list_id","is_confirmed");--> statement-breakpoint
CREATE INDEX "plan_holder_contact_match_status_idx" ON "plan_holder_contact" USING btree ("match_status");--> statement-breakpoint
CREATE INDEX "plan_holder_list_org_id_idx" ON "plan_holder_list" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "plan_holder_list_project_id_idx" ON "plan_holder_list" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "plan_holder_list_document_id_idx" ON "plan_holder_list" USING btree ("document_id");--> statement-breakpoint
CREATE POLICY "plan_holder_contact_org_isolation" ON "plan_holder_contact" AS PERMISSIVE FOR ALL TO "authenticated" USING ("plan_holder_contact"."org_id" = public.current_org_id()) WITH CHECK ("plan_holder_contact"."org_id" = public.current_org_id());--> statement-breakpoint
CREATE POLICY "plan_holder_list_org_isolation" ON "plan_holder_list" AS PERMISSIVE FOR ALL TO "authenticated" USING ("plan_holder_list"."org_id" = public.current_org_id()) WITH CHECK ("plan_holder_list"."org_id" = public.current_org_id());