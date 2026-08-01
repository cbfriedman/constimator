// Standalone script — not part of the Next.js app. Inserts the 3 sample
// projects used throughout the dashboard/homepage demo copy (Shasta County,
// Anderson Water Main, Redding Airport Apron) into one org, so /dashboard
// shows real DB rows that match the numbers in the product copy instead of
// an empty table. Idempotent — skips any project number that already exists
// for the org.
//
// Requires a real DATABASE_URL (Supabase Project Settings → Database →
// Connection string, URI) and an existing org row — this does NOT create
// orgs or users, only projects.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/seed-sample-projects.ts [org-slug]
// If org-slug is omitted, the script uses the only org in the database and
// fails with a list of available slugs if there's more than one.

import postgres from "postgres"

const SAMPLE_PROJECTS = [
  {
    name: "Shasta County Roadway Improvements",
    number: "24-118",
    owner: "Shasta County Public Works",
    projectType: "Civil / Roadway / Public Works",
    location: "Shasta County, CA",
    status: "reconciliation",
    bidDate: "2026-08-22",
    engineersEstimate: "1850000",
    prevailingWage: true,
    workingDays: 60,
    liquidatedDamagesPerDay: "2500",
  },
  {
    name: "Anderson Water Main Replacement",
    number: "25-042",
    owner: "City of Anderson",
    projectType: "Water/Sewer",
    location: "Anderson, CA",
    status: "estimating",
    bidDate: "2026-09-04",
    engineersEstimate: "920000",
    prevailingWage: true,
    workingDays: null,
    liquidatedDamagesPerDay: null,
  },
  {
    name: "Redding Airport Apron Rehab",
    number: "25-107",
    owner: "City of Redding",
    projectType: "Site Work",
    location: "Redding, CA",
    status: "documents",
    bidDate: "2026-09-18",
    engineersEstimate: "3400000",
    prevailingWage: true,
    workingDays: null,
    liquidatedDamagesPerDay: null,
  },
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
          : "No orgs exist yet — sign up and complete org setup first.",
      )
    }
    if (orgs.length > 1) {
      const slugs = orgs.map((o) => o.slug).join(", ")
      throw new Error(
        `Multiple orgs exist (${slugs}) — pass one explicitly: npx tsx --env-file=.env.local scripts/seed-sample-projects.ts <org-slug>`,
      )
    }

    const org = orgs[0]
    console.log(`Seeding sample projects into org "${org.name}" (${org.slug})`)

    for (const project of SAMPLE_PROJECTS) {
      const existing = await sql`
        select id from public.project
        where org_id = ${org.id} and number = ${project.number}
      `
      if (existing.length > 0) {
        console.log(`  skip — #${project.number} already exists`)
        continue
      }

      await sql`
        insert into public.project (
          org_id, name, number, owner, project_type, location, status,
          bid_date, engineers_estimate, prevailing_wage, working_days,
          liquidated_damages_per_day
        ) values (
          ${org.id}, ${project.name}, ${project.number}, ${project.owner},
          ${project.projectType}, ${project.location}, ${project.status},
          ${project.bidDate}, ${project.engineersEstimate}, ${project.prevailingWage},
          ${project.workingDays}, ${project.liquidatedDamagesPerDay}
        )
      `
      console.log(`  inserted — #${project.number} ${project.name}`)
    }
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
