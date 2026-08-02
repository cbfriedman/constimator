import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", "worker/**", "scripts/takeoff-validation/**", ".next/**"],
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      // See test/mocks/server-only.ts — real "server-only" throws outside
      // React's "react-server" export condition, which Vitest doesn't set.
      "server-only": path.resolve(import.meta.dirname, "test/mocks/server-only.ts"),
    },
  },
})
