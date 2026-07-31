ALTER TABLE "estimate" ADD COLUMN "rate_drift" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "estimate" ADD COLUMN "drift_dismissed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "estimate" ADD COLUMN "recalculated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "org" ADD COLUMN "cost_setup_complete" boolean DEFAULT false NOT NULL;