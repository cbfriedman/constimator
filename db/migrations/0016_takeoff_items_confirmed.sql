-- Custom SQL migration file, put your code below! --

-- Plan-takeoff results now need a human confirm before they reach the
-- estimate, like every other extractor in this app.
--
-- docs/Constimator-Client-Requirements-Todo.md states the house rule
-- outright: "Do not skip the human confirm click on anything the AI
-- extracted." Sub quotes and plan-holder lists honour it — worker
-- process-job.ts lands them in `needs_review` and only the review screen
-- materialises them. Plan takeoff was the one path that wrote straight
-- through: app/processing/actions.ts's syncEstimateFromCompleteJobs() pulled
-- every complete job's measured quantities into estimate_line on each
-- /processing page load, with nobody having looked at them.
--
-- It is also the extractor with the weakest claim to trust. worker/src/
-- extract.ts prompts for "your best measured/counted quantity" off
-- rasterized plan sheets — computer-vision measurement, which
-- docs/DECISIONS.md scoped out of Phase 1 precisely because of its accuracy
-- risk (that exclusion is now retracted in the doc; the feature shipped).
-- And the pages it measured from are capped at 20, so on a real plan set the
-- quantities are partial as well as unverified.
--
-- Nothing is priced from these quantities (generate-estimate.ts deliberately
-- refuses to invent a unit price), but a quantity is what the contractor
-- multiplies their unit price by, so a wrong quantity is still a wrong bid.
--
-- Null = extracted but not yet confirmed. Existing rows are backfilled to
-- now() rather than left null: those quantities are already in the org's
-- estimate_line rows from the old auto-sync, so treating them as
-- unconfirmed would not un-write them — it would only make the UI ask for a
-- confirm that has no effect. New jobs start null and require the click.
ALTER TABLE "takeoff_job"
  ADD COLUMN IF NOT EXISTS "items_confirmed_at" timestamp with time zone;--> statement-breakpoint

-- No new index. /processing reads jobs by document_id, which
-- takeoff_job_document_id_idx already serves, and a partial index on
-- items_confirmed_at cannot be expressed in db/schema.ts — it would read as
-- drift on the next `pnpm db:generate`.
UPDATE "takeoff_job"
SET "items_confirmed_at" = now()
WHERE "status" = 'complete'
  AND "items_confirmed_at" IS NULL;
