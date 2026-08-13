import { expect, test } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import postgres from "postgres"

// Runs the live two-org cross-tenant test documented in
// docs/SECURITY-REVIEW.md's "Live test plan" — written but never executed
// there because DATABASE_URL was a placeholder at the time it was authored.
// It's real now, so this automates that plan: two real orgs (via the
// Supabase Admin API, same pattern as e2e/global-setup.ts), Org B gets real
// data, Org A tries to reach it two ways — URL-based reads, and a replayed
// Server Action request with Org B's id spliced in. The replay reuses a
// request Org A's own browser actually issued rather than hand-building the
// Next.js Server Action wire format, then checks the *database* directly
// (bypassing the app entirely, via a raw DATABASE_URL connection) for ground
// truth on whether a cross-org row got created — not just a UI message.
//
// Cleans up both throwaway orgs (cascades: bid/project/user rows) and both
// Supabase Auth users afterward, since this writes real rows into the real
// database configured in .env.local.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DATABASE_URL = process.env.DATABASE_URL

test.describe.configure({ mode: "serial" })

type TestOrgUser = { email: string; password: string; authUserId: string }

async function createOrgUser(label: string): Promise<TestOrgUser> {
  const admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!)
  const email = `sec-${label}-${Date.now()}@constimator-test.local`
  const password = `Sec-${label}-${Date.now()}-Aa1!`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) {
    throw new Error(`Failed to create ${label} test user: ${error?.message}`)
  }
  return { email, password, authUserId: data.user.id }
}

let orgA: TestOrgUser
let orgB: TestOrgUser
let sql: ReturnType<typeof postgres>

test.beforeAll(async () => {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !DATABASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DATABASE_URL must all be set " +
        "to run the live cross-org security test.",
    )
  }
  sql = postgres(DATABASE_URL, { prepare: false })
  orgA = await createOrgUser("org-a")
  orgB = await createOrgUser("org-b")
})

test.afterAll(async () => {
  const admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!)
  for (const user of [orgA, orgB]) {
    if (!user) continue
    const [row] = await sql`select org_id from "user" where id = ${user.authUserId}`
    if (row) {
      await sql`delete from org where id = ${row.org_id}`
    }
    await admin.auth.admin.deleteUser(user.authUserId)
  }
  await sql.end()
})

async function bidCountForProject(projectId: string): Promise<number> {
  const [row] = await sql`select count(*)::int as count from bid where project_id = ${projectId}`
  return row.count
}

async function signIn(page: import("@playwright/test").Page, user: TestOrgUser) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(user.email)
  await page.getByLabel("Password", { exact: true }).fill(user.password)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await page.waitForURL("**/dashboard")
}

async function createProject(page: import("@playwright/test").Page, name: string) {
  await page.getByRole("button", { name: "New Project" }).click()
  await page.waitForURL("**/projects/new")
  await page.getByLabel("Project Name").fill(name)
  await page.getByRole("button", { name: "Continue to Upload Documents" }).click()
  await page.waitForURL(/\/upload\?project=/)
  return new URL(page.url()).searchParams.get("project")!
}

test("Org A cannot read or write Org B's data across tenants", async ({ browser }) => {
  test.setTimeout(3 * 60 * 1000)

  const bContext = await browser.newContext()
  const bPage = await bContext.newPage()
  let orgBProjectId = ""
  await test.step("Org B signs in and creates a real project", async () => {
    await signIn(bPage, orgB)
    orgBProjectId = await createProject(bPage, `Security Test Org B ${Date.now()}`)
    expect(orgBProjectId).toBeTruthy()
  })
  await bContext.close()

  const aContext = await browser.newContext()
  const aPage = await aContext.newPage()
  let orgAProjectId = ""
  await test.step("Org A signs in and creates its own real project", async () => {
    await signIn(aPage, orgA)
    orgAProjectId = await createProject(aPage, `Security Test Org A ${Date.now()}`)
    expect(orgAProjectId).toBeTruthy()
  })

  await test.step("Org A cannot reach Org B's project via /upload", async () => {
    await aPage.goto(`/upload?project=${orgBProjectId}`)
    await expect(aPage.getByText("Project not found")).toBeVisible()
  })

  await test.step("Org A cannot reach Org B's project via /processing", async () => {
    await aPage.goto(`/processing?project=${orgBProjectId}`)
    await expect(aPage.getByText("No project found")).toBeVisible()
  })

  await test.step("replayed addBidLineAction with Org B's id spliced in creates nothing", async () => {
    const before = await bidCountForProject(orgBProjectId)
    expect(before).toBe(0)

    await aPage.goto("/reconciliation")
    const actionUrl = aPage.url()

    await aPage.getByRole("button", { name: "Add Bid Item" }).click()
    await aPage.getByLabel("Item #").fill("1")
    await aPage.getByLabel("Unit").fill("EA")
    await aPage.getByLabel("Description").fill("Security test — legitimate line")
    await aPage.getByLabel("Official quantity").fill("1")

    const [legitRequest] = await Promise.all([
      aPage.waitForRequest(
        (req) => req.url() === actionUrl && req.method() === "POST",
      ),
      aPage.getByRole("button", { name: "Save", exact: true }).click(),
    ])

    const headers = await legitRequest.allHeaders()
    const body = legitRequest.postData() ?? ""
    expect(body).toContain(orgAProjectId)

    // Sanity check: the legitimate call actually landed under Org A's own
    // project before we trust the replay's result at all.
    await expect
      .poll(() => bidCountForProject(orgAProjectId))
      .toBeGreaterThan(0)

    const splicedBody = body.replaceAll(orgAProjectId, orgBProjectId)
    expect(splicedBody).not.toBe(body)

    await aPage.request.post(actionUrl, {
      headers: {
        "content-type": headers["content-type"] ?? "text/plain;charset=UTF-8",
        "next-action": headers["next-action"] ?? "",
      },
      data: splicedBody,
    })

    // Ground truth from the database itself, not a UI message — did the
    // replayed request, aimed at Org B's project, actually create a row
    // there? It shouldn't: addBidLineAction re-checks the project belongs
    // to the caller's own org (app/reconciliation/actions.ts) before
    // inserting anything.
    const after = await bidCountForProject(orgBProjectId)
    expect(after).toBe(0)
  })

  await aContext.close()
})
