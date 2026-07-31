import { defineConfig } from "drizzle-kit"

// Only commands that talk to a live database (migrate/push/studio/introspect)
// need DATABASE_URL — `generate` diffs schema.ts against local migration
// history and doesn't touch the database, so this stays unset-tolerant here.
export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
})
