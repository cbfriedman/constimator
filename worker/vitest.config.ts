// The worker is its own npm package (see README.md). Without a config here
// Vitest walks up and loads the repo root's vitest.config.ts, which imports
// "vitest/config" from the root node_modules — not installed in the Worker
// CI job, which only runs `npm ci` inside worker/.
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
