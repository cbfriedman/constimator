import { spawn, type ChildProcess } from "node:child_process"
import path from "node:path"

import { createClient } from "@supabase/supabase-js"

// Creates a fresh, pre-confirmed test user via the Supabase Admin API rather
// than signing up through the UI — real signup requires clicking an email
// confirmation link, which would make this suite depend on an inbox. The
// generated credentials are handed to the spec via env vars, which Playwright
// forwards to test workers since they're spawned after this function returns
// (see e2e/full-flow.spec.ts).
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
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) {
    throw new Error(`Failed to create e2e test user: ${error.message}`)
  }

  process.env.E2E_TEST_EMAIL = email
  process.env.E2E_TEST_PASSWORD = password
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
  await createConfirmedTestUser()
  const worker = startWorker()

  return async () => {
    worker.kill()
  }
}
