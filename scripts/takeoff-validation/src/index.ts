import "dotenv/config"
import { readdir, readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { rasterizePdf } from "./rasterize.js"
import { extractQuantities } from "./extract.js"
import { printComparison } from "./compare.js"
import type { KnownQuantities } from "./types.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PLAN_SETS_DIR = path.join(__dirname, "..", "plan-sets")

async function loadPlanSet(planSetDir: string) {
  const files = await readdir(planSetDir)
  const pdfFile = files.find((f) => f.toLowerCase().endsWith(".pdf"))
  if (!pdfFile) {
    throw new Error(`No .pdf file found in ${planSetDir}`)
  }

  const knownPath = path.join(planSetDir, "known-quantities.json")
  if (!existsSync(knownPath)) {
    throw new Error(
      `No known-quantities.json in ${planSetDir} — see plan-sets/README.md for the format.`,
    )
  }

  const known: KnownQuantities = JSON.parse(await readFile(knownPath, "utf-8"))

  return { pdfPath: path.join(planSetDir, pdfFile), known }
}

async function main() {
  if (!existsSync(PLAN_SETS_DIR)) {
    console.error(`No plan-sets/ directory found at ${PLAN_SETS_DIR}`)
    process.exit(1)
  }

  const entries = await readdir(PLAN_SETS_DIR, { withFileTypes: true })
  const planSetDirs = entries.filter((e) => e.isDirectory())

  if (planSetDirs.length === 0) {
    console.error(
      "No plan sets found. Add a subdirectory under plan-sets/ per plan set — see plan-sets/README.md.",
    )
    process.exit(1)
  }

  for (const dir of planSetDirs) {
    const planSetName = dir.name
    const planSetDir = path.join(PLAN_SETS_DIR, planSetName)

    try {
      const { pdfPath, known } = await loadPlanSet(planSetDir)

      console.log(`\nRasterizing ${planSetName}...`)
      const pages = await rasterizePdf(pdfPath, known.pages)

      console.log(`Sending ${pages.length} page(s) to Claude for extraction...`)
      const extracted = await extractQuantities(pages)

      printComparison({
        planSetName,
        known,
        extracted,
        pageCount: pages.length,
      })
    } catch (err) {
      console.error(`\n✗ ${planSetName} failed:`, err instanceof Error ? err.message : err)
    }
  }
}

main()
