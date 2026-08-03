// Standalone script — not part of the Next.js app. Populates the official
// bid form (public.bid) for an org's Shasta County Roadway Improvements
// project (#24-118) with the 15 canonical line items used throughout the
// product's demo copy (homepage hero, dashboard, this reconciliation
// table), so /reconciliation shows a real, populated diff instead of "No
// official bid form entered yet."
//
// Matches each bid line against whatever's already in the project's
// estimate (by exact description, same rule lib/reconciliation-diff.ts
// uses) so real reconciliation math produces the intended mix: 12 clean
// matches, 3 lump-sum items, 1 quantity discrepancy (RCP), 1 unit mismatch
// (Cold Plane AC), and 1 missing item (Minor Concrete) — 3 items needing
// attention in total, same as the homepage/dashboard copy.
//
// If an estimate line already exists for "Minor Concrete (Curb & Gutter)"
// with the same quantity as the bid form (i.e. it would just match and
// nothing would be "missing"), this deletes that one estimate line so the
// missing-item scenario is real, not faked — matches the intended demo
// narrative where that's the one item the contractor hasn't priced yet.
//
// Idempotent — skips any item_number that already exists as a bid row for
// the project.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/seed-shasta-bid-form.ts [org-slug]
// If org-slug is omitted, the script uses the only org in the database and
// fails with a list of available slugs if there's more than one.

import postgres from "postgres"

const SHASTA_PROJECT_NUMBER = "24-118"

const BID_LINES = [
  { itemNumber: "1", description: "Mobilization", unit: "LS", officialQuantity: "1", specSection: "00 73 00" },
  { itemNumber: "2", description: "Traffic Control System", unit: "LS", officialQuantity: "1", specSection: "12-4" },
  { itemNumber: "3", description: "Clearing & Grubbing", unit: "LS", officialQuantity: "1", specSection: "17-2" },
  { itemNumber: "4", description: "Roadway Excavation", unit: "CY", officialQuantity: "8450", specSection: "19-2" },
  { itemNumber: "5", description: "Class 2 Aggregate Base", unit: "TON", officialQuantity: "6200", specSection: "26-1" },
  { itemNumber: "6", description: "HMA Type A", unit: "TON", officialQuantity: "4850", specSection: "39-2" },
  // Intentional unit mismatch — bid form lists SF, estimate line is in SY.
  { itemNumber: "7", description: "Cold Plane AC (2\")", unit: "SF", officialQuantity: "110700", specSection: "39-1" },
  // Intentional quantity discrepancy vs. the estimate line's 640 LF.
  { itemNumber: "8", description: "18\" RCP Class III", unit: "LF", officialQuantity: "655", specSection: "71-2" },
  { itemNumber: "9", description: "Drainage Inlet (Type GO)", unit: "EA", officialQuantity: "12", specSection: "71-3" },
  { itemNumber: "10", description: "Adjust Manhole to Grade", unit: "EA", officialQuantity: "9", specSection: "71-4" },
  { itemNumber: "11", description: "Thermoplastic Traffic Stripe", unit: "LF", officialQuantity: "24500", specSection: "84-2" },
  { itemNumber: "12", description: "Pavement Marking Thermo", unit: "SF", officialQuantity: "1850", specSection: "84-2" },
  { itemNumber: "13", description: "Roadside Sign (One Post)", unit: "EA", officialQuantity: "14", specSection: "56-2" },
  { itemNumber: "14", description: "Erosion Control (Hydroseed)", unit: "SF", officialQuantity: "45000", specSection: "21-1" },
  // Intentionally left unmatched — see file header.
  { itemNumber: "15", description: "Minor Concrete (Curb & Gutter)", unit: "LF", officialQuantity: "2150", specSection: "73-2" },
] as const

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set")
  }

  const sql = postgres(connectionString, { prepare: false })
  const orgSlug = process.argv[2]

  try {
    const orgs = orgSlug
      ? await sql`select id, slug, name from public.org where slug = ${orgSlug}`
      : await sql`select id, slug, name from public.org`

    if (orgs.length === 0) {
      throw new Error(
        orgSlug
          ? `No org found with slug "${orgSlug}".`
          : "No orgs exist yet.",
      )
    }
    if (orgs.length > 1) {
      const slugs = orgs.map((o) => o.slug).join(", ")
      throw new Error(
        `Multiple orgs exist (${slugs}) — pass one explicitly: npx tsx --env-file=.env.local scripts/seed-shasta-bid-form.ts <org-slug>`,
      )
    }

    const org = orgs[0]

    const [project] = await sql`
      select id, name from public.project
      where org_id = ${org.id} and number = ${SHASTA_PROJECT_NUMBER}
    `
    if (!project) {
      throw new Error(
        `No project #${SHASTA_PROJECT_NUMBER} for org "${org.name}" — run seed-sample-projects.ts first.`,
      )
    }

    const [estimate] = await sql`
      select id from public.estimate where project_id = ${project.id}
    `
    if (!estimate) {
      throw new Error(
        `Project "${project.name}" has no estimate row yet — visit /estimate for this project first.`,
      )
    }

    console.log(`Seeding bid form for "${project.name}" (org "${org.name}")`)

    // Break the Minor Concrete match, if any, so it's a real "missing from
    // estimate" scenario rather than a coincidental match.
    const missingLine = BID_LINES.find((line) => line.itemNumber === "15")!
    const deleted = await sql`
      delete from public.estimate_line
      where estimate_id = ${estimate.id}
        and lower(trim(description)) = ${missingLine.description.toLowerCase()}
      returning id
    `
    if (deleted.length > 0) {
      console.log(
        `  removed existing estimate line for "${missingLine.description}" so it shows as missing`,
      )
    }

    for (const line of BID_LINES) {
      const existing = await sql`
        select id from public.bid
        where project_id = ${project.id} and item_number = ${line.itemNumber}
      `
      if (existing.length > 0) {
        console.log(`  skip — item ${line.itemNumber} already exists`)
        continue
      }

      await sql`
        insert into public.bid (
          org_id, project_id, item_number, description, unit,
          official_quantity, spec_section
        ) values (
          ${org.id}, ${project.id}, ${line.itemNumber}, ${line.description},
          ${line.unit}, ${line.officialQuantity}, ${line.specSection}
        )
      `
      console.log(`  inserted — item ${line.itemNumber} ${line.description}`)
    }

    // Reconciliation status now genuinely has flagged items — matches the
    // "reconciliation" project status used in dashboard/status-label copy.
    await sql`
      update public.project set status = 'reconciliation' where id = ${project.id}
    `
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
