import { config as loadEnv } from "dotenv"
import { defineConfig } from "drizzle-kit"

// drizzle-kit is a standalone CLI, not a Next.js process, so nothing loads
// .env.local for it the way `next dev` does — without this, DATABASE_URL is
// simply absent and migrate/studio fail with an empty-url error even though
// the variable is sitting right there in the file the rest of the app uses.
// Same precedence Next.js applies: .env.local wins, .env fills in the rest.
loadEnv({ path: ".env.local" })
loadEnv({ path: ".env" })

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
