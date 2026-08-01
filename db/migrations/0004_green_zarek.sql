CREATE TABLE "ai_usage_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"estimated_cost_usd" numeric(10, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_usage_event" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "org" ADD COLUMN "ai_monthly_spend_cap_usd" numeric(10, 2) DEFAULT '20.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_usage_event" ADD CONSTRAINT "ai_usage_event_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_event_org_id_idx" ON "ai_usage_event" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ai_usage_event_org_id_created_at_idx" ON "ai_usage_event" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE POLICY "ai_usage_event_org_isolation" ON "ai_usage_event" AS PERMISSIVE FOR ALL TO "authenticated" USING ("ai_usage_event"."org_id" = public.current_org_id()) WITH CHECK ("ai_usage_event"."org_id" = public.current_org_id());