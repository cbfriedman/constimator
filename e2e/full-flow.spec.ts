import path from "node:path"

import { expect, test } from "@playwright/test"

// Full golden path against the real stack — real Supabase auth, real
// Postgres, a real PDF uploaded to real Storage, and a real takeoff run
// through worker/ (which calls Claude). Nothing here is mocked, so it's slow
// (the "wait for takeoff" step alone can take a couple of minutes) — that's
// expected, not a bug. The test user is created fresh per run by
// e2e/global-setup.ts and handed over via env vars.

test("sign in, create a project, upload a plan, wait for takeoff, view the estimate, export", async ({
  page,
}) => {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD
  if (!email || !password) {
    throw new Error("E2E_TEST_EMAIL/E2E_TEST_PASSWORD were not set by e2e/global-setup.ts")
  }

  await test.step("sign in", async () => {
    await page.goto("/sign-in")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: "Sign in", exact: true }).click()
    await page.waitForURL("**/dashboard")
  })

  await test.step("create project", async () => {
    // Fresh org, so the dashboard is in its empty state — go through it
    // rather than deep-linking, so this also exercises that entry point.
    await page.getByRole("button", { name: "New Project" }).click()
    await page.waitForURL("**/projects/new")

    const projectName = `E2E Test Project ${Date.now()}`
    await page.getByLabel("Project Name").fill(projectName)
    await page.getByRole("button", { name: "Continue to Upload Documents" }).click()
    await page.waitForURL(/\/upload\?project=/)
  })

  await test.step("upload a plan", async () => {
    await page
      .locator('input[type="file"]')
      .setInputFiles(path.join(__dirname, "fixtures", "sample-bid-form.pdf"))

    // Real upload: signed URL round trip + a PUT to Storage, then a server
    // action to record it — give it real time instead of a tight timeout.
    await expect(page.getByText("Uploaded", { exact: true })).toBeVisible({
      timeout: 30_000,
    })

    // The fixture uploads as a generic "Supporting Document", so the
    // bid-form checklist is unsatisfied — dismiss that warning to proceed,
    // same as a contractor skipping it deliberately.
    await page.getByRole("button", { name: "Continue Anyway" }).click()
    await page.getByRole("button", { name: "Start AI Analysis" }).click()
    await page.waitForURL(/\/processing/)
  })

  await test.step("wait for takeoff to complete", async () => {
    // ProcessingShell's status heading is a styled <div> (CardTitle), not a
    // heading element — match on text, not role.
    await expect(page.getByText("Processing complete", { exact: true })).toBeVisible({
      timeout: 5 * 60 * 1000,
    })
  })

  await test.step("view estimate", async () => {
    await page.goto("/estimate")
    await expect(page.getByRole("heading", { name: "Estimate Workspace" })).toBeVisible()
  })

  await test.step("export", async () => {
    await page.goto("/reports")
    await page.getByRole("button", { name: "Export PDF" }).click()

    // A brand-new project hasn't completed cost setup, so export is gated
    // behind a "preliminary" confirmation dialog — same path a real
    // contractor hits exporting before finishing rates.
    const exportAnyway = page.getByRole("button", {
      name: "Export Anyway (marked Preliminary)",
    })
    if (await exportAnyway.isVisible().catch(() => false)) {
      await exportAnyway.click()
    }

    await expect(page.getByText(/ready/i)).toBeVisible({ timeout: 10_000 })
  })
})
