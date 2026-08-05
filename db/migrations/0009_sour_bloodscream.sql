CREATE TYPE "public"."review_request_status" AS ENUM('requested', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."review_scope" AS ENUM('full', 'reconciliation', 'discrepancy', 'proposal');--> statement-breakpoint
CREATE TABLE "review_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"requested_by" uuid,
	"scope" "review_scope"[] DEFAULT '{}' NOT NULL,
	"notes" text,
	"status" "review_request_status" DEFAULT 'requested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review_request" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "review_request" ADD CONSTRAINT "review_request_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_request" ADD CONSTRAINT "review_request_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_request" ADD CONSTRAINT "review_request_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_request_org_id_idx" ON "review_request" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "review_request_project_id_idx" ON "review_request" USING btree ("project_id");--> statement-breakpoint
CREATE POLICY "review_request_org_isolation" ON "review_request" AS PERMISSIVE FOR ALL TO "authenticated" USING ("review_request"."org_id" = public.current_org_id()) WITH CHECK ("review_request"."org_id" = public.current_org_id());