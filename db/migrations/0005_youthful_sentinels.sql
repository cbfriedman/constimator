CREATE TABLE "worker_heartbeat" (
	"id" text PRIMARY KEY DEFAULT 'worker' NOT NULL,
	"last_polled_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
