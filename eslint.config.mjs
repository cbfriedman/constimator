import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // lib/db/client.ts is the raw, unscoped Drizzle client — importing it
  // directly bypasses the org isolation that lib/db/scoped.ts's
  // getScopedDb() applies (step 10). Everywhere except those two files must
  // go through getScopedDb() (or, for the one narrow system/ops case —
  // app/api/health, step 29 — lib/db/system.ts) instead. Two rules: the
  // alias form (how every other file in this codebase imports across
  // directories) applies project-wide; the relative form only applies
  // inside lib/db/ itself, since restricting bare "./client" project-wide
  // would false-positive on any unrelated file elsewhere that happens to
  // also be named client.ts.
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["lib/db/scoped.ts", "lib/db/system.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/db/client",
              message:
                "Don't import the raw Drizzle client directly — it isn't org-scoped. Use getScopedDb() from '@/lib/db/scoped' instead (or lib/db/system.ts for the narrow system/ops case).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/db/**/*.{ts,tsx}"],
    ignores: ["lib/db/scoped.ts", "lib/db/client.ts", "lib/db/system.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["./client"],
              message:
                "Don't import the raw Drizzle client directly — it isn't org-scoped. Use getScopedDb() from '@/lib/db/scoped' instead (or lib/db/system.ts for the narrow system/ops case).",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
