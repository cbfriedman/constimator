import { spawn, type ChildProcess } from "node:child_process"
import path from "node:path"

import { createClient } from "@supabase/supabase-js"
import postgres from "postgres"

// Creates a fresh, pre-confirmed test user via the Supabase Admin API rather
// than signing up through the UI — real signup requires clicking an email
// confirmation link, which would make this suite depend on an inbox. The
// generated credentials are handed to the spec via env vars, which Playwright
// forwards to test workers since they're spawned after this function returns
// (see e2e/full-flow.spec.ts). Returns the auth user id too, so the caller
// can delete it again in teardown — earlier runs of this suite left three
// throwaway orgs behind in the real database because nothing did that.
async function createConfirmedTestUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to run the e2e suite " +
        "(used to create a pre-confirmed throwaway test user via the Supabase Admin API). " +
        "Add SUPABASE_SERVICE_ROLE_KEY to e2e/.env.local — see e2e/.env.example.",
    )
  }

  const email = `e2e-${Date.now()}@constimator-test.local`
  const password = `E2e-${Date.now()}-Aa1!`

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) {
    throw new Error(`Failed to create e2e test user: ${error?.message}`)
  }

  process.env.E2E_TEST_EMAIL = email
  process.env.E2E_TEST_PASSWORD = password

  return data.user.id
}

// Deletes the org the sign-up trigger created for this user (cascades to the
// user/project/document/etc. rows under it) and then the Supabase Auth user
// itself — a separate system the org deletion doesn't reach.
async function deleteTestUserAndOrg(authUserId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const databaseUrl = process.env.DATABASE_URL

  if (databaseUrl) {
    const sql = postgres(databaseUrl, { prepare: false })
    try {
      const [row] = await sql`select org_id from "user" where id = ${authUserId}`
      if (row) {
        await sql`delete from org where id = ${row.org_id}`
      }
    } finally {
      await sql.end()
    }
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)
  await admin.auth.admin.deleteUser(authUserId)
}

// The takeoff worker (worker/) is a standalone process — not started by
// `next dev` — that must be running for the "wait for takeoff" step to ever
// leave "queued" (see worker/src/index.ts). It has no HTTP server to
// health-check, so it's spawned directly here instead of through Playwright's
// webServer config (which expects a url/port to poll).
function startWorker(): ChildProcess {
  return spawn("npm", ["run", "dev"], {
    cwd: path.resolve(import.meta.dirname, "..", "worker"),
    stdio: "inherit",
    shell: true,
  })
}

export default async function globalSetup() {
  const authUserId = await createConfirmedTestUser()
  const worker = startWorker()

  return async () => {
    worker.kill()
    await deleteTestUserAndOrg(authUserId)
  }
}
