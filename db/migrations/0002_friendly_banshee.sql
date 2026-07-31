CREATE TYPE "public"."takeoff_job_status" AS ENUM('queued', 'running', 'complete', 'failed');--> statement-breakpoint
CREATE TABLE "takeoff_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"status" "takeoff_job_status" DEFAULT 'queued' NOT NULL,
	"result" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "takeoff_job" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "takeoff_job" ADD CONSTRAINT "takeoff_job_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "takeoff_job" ADD CONSTRAINT "takeoff_job_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "takeoff_job_org_id_idx" ON "takeoff_job" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "takeoff_job_document_id_idx" ON "takeoff_job" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "takeoff_job_status_idx" ON "takeoff_job" USING btree ("status");--> statement-breakpoint
CREATE POLICY "takeoff_job_org_isolation" ON "takeoff_job" AS PERMISSIVE FOR ALL TO "authenticated" USING ("takeoff_job"."org_id" = public.current_org_id()) WITH CHECK ("takeoff_job"."org_id" = public.current_org_id());