import path from "node:path"

import { defineConfig, devices } from "@playwright/test"
import dotenv from "dotenv"

// playwright.config.ts runs as plain Node, so it doesn't get Next's
// automatic .env.local loading — load it ourselves, plus the e2e-only
// secrets in e2e/.env.local (see e2e/.env.example).
dotenv.config({ path: path.resolve(import.meta.dirname, ".env.local") })
dotenv.config({ path: path.resolve(import.meta.dirname, "e2e/.env.local") })

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000"

export default defineConfig({
  testDir: "./e2e",
  // A real takeoff run calls Claude on an uploaded PDF and can take a
  // couple of minutes — slow is fine, per the brief, but it isn't instant.
  timeout: 6 * 60 * 1000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
