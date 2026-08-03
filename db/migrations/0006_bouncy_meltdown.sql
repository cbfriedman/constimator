CREATE TYPE "public"."subscription_status" AS ENUM('none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused');--> statement-breakpoint
ALTER TABLE "org" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "org" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "org" ADD COLUMN "subscription_status" "subscription_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "org" ADD COLUMN "current_period_end" timestamp with time zone;