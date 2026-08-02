import postgres from "postgres"

/**
 * Provisions public.org + public.user for any auth.users row that has no
 * membership yet (e.g. signed up before migration 0003's trigger existed).
 */
const sql = postgres(process.env.DATABASE_URL, { prepare: false })

try {
  const missing = await sql`
    select a.id, a.email
    from auth.users a
    left join public.user u on u.id = a.id
    where u.id is null
    order by a.created_at
  `

  if (!missing.length) {
    console.log("No auth users missing org membership.")
    process.exit(0)
  }

  for (const row of missing) {
    const email = row.email ?? "user@example.com"
    const local = String(email).split("@")[0] || "user"
    const name = `${local.charAt(0).toUpperCase()}${local.slice(1)}'s Company`
    const slug = `${local.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${String(row.id).slice(0, 8)}`

    const [org] = await sql`
      insert into public.org (name, slug)
      values (${name}, ${slug})
      returning id, name, slug
    `
    await sql`
      insert into public.user (id, org_id, role, email)
      values (${row.id}, ${org.id}, 'admin', ${email})
    `
    console.log(`provisioned ${email} -> org ${org.slug}`)
  }
} finally {
  await sql.end()
}
