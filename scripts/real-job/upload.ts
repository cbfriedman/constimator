// Standalone script — not part of the Next.js app. Puts a real PDF through
// the real pipeline without a browser: uploads it to Supabase Storage the
// same way app/upload/actions.ts does, inserts the document row, queues a
// takeoff_job, and then waits for a worker to pick it up.
//
// This is the actual production path, minus the UI — same bucket, same
// storage-path convention (org/project/uuid-name, which
// worker/src/process-job.ts checks before it will download anything), same
// queued-job row the worker polls for. What it deliberately does NOT
// reproduce is the browser's signed-upload-URL round trip: there's no user
// session here, so it writes with the service-role key directly. Everything
// downstream of the document row is identical.
//
// Whichever worker sees the queued row first processes it — if the deployed
// Railway worker is running against this same database, that may well be
// the one, not your local `npm run dev`. That's fine for measuring
// extraction accuracy (the code is the same); it matters only if you wanted
// to watch local logs, in which case stop the deployed worker first.
//
// Usage:
//   node --env-file=.env.local scripts/real-job/upload.ts <pdf-path> [options]
//
// Options:
//   --org <slug>          Required if the database has more than one org.
//   --project <number>    Project number (e.g. 24-118). Required if the org
//                         has more than one project.
//   --type <doc-type>     plans | specifications | bid_form | addendum |
//                         plan_holders | other. Defaults to bid_form.
//   --label <text>        Only with --type plan_holders: the roster's source
//                         label ("Online Plan Service export, 3/14"), which
//                         the app requires and the extractor can't infer.
//   --no-wait             Queue the job and exit instead of waiting.
//   --timeout <seconds>   How long to wait for the job. Default 900.

import { randomUUID } from "node:crypto"
import { readFile, stat } from "node:fs/promises"
import { basename } from "node:path"

import postgres from "postgres"

const DOCUMENTS_BUCKET = "project-documents"
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024
// Mirrors the document_type enum, minus sub_quote — a sub quote needs its
// sub's name and trade recorded alongside the file, which this harness has
// nowhere to ask for (scripts/real-job/run-sub-quote-samples.mjs covers that
// path instead). plan_holders IS here: a roster needs only a source label,
// which --label supplies.
const DOC_TYPES = [
  "plans",
  "specifications",
  "bid_form",
  "addendum",
  "plan_holders",
  "other",
]
const TRIAL_DAYS = 30
const ENTITLED_STATUSES = ["trialing", "active"]

type Args = {
  pdfPath: string
  org?: string
  project?: string
  type: string
  label?: string
  wait: boolean
  timeoutSeconds: number
}

function parseArgs(argv: string[]): Args {
  const positional: string[] = []
  const flags = new Map<string, string>()

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith("--")) {
      positional.push(arg)
      continue
    }
    const name = arg.slice(2)
    if (name === "no-wait") {
      flags.set("no-wait", "true")
      continue
    }
    const value = argv[++i]
    if (value === undefined) throw new Error(`--${name} needs a value`)
    flags.set(name, value)
  }

  const pdfPath = positional[0]
  if (!pdfPath) {
    throw new Error(
      "Usage: node --env-file=.env.local scripts/real-job/upload.ts <pdf-path> [--org slug] [--project number] [--type bid_form]",
    )
  }

  const type = flags.get("type") ?? "bid_form"
  if (!DOC_TYPES.includes(type)) {
    throw new Error(`--type must be one of: ${DOC_TYPES.join(", ")}`)
  }

  // Required rather than defaulted, matching the app's own upload: agencies
  // and plan services reissue a roster as more bidders pull documents, and
  // the only thing telling the 3/14 issue from the 3/21 one is what a human
  // calls it. A default here would quietly make every run look like the same
  // roster.
  const label = flags.get("label")
  if (type === "plan_holders" && !label) {
    throw new Error(
      "--type plan_holders needs --label, e.g. --label 'Online Plan Service export, 3/14'",
    )
  }

  return {
    pdfPath,
    org: flags.get("org"),
    project: flags.get("project"),
    type,
    label,
    wait: !flags.has("no-wait"),
    timeoutSeconds: Number(flags.get("timeout") ?? 900),
  }
}

// Mirrors lib/billing.ts's getBillingStatus. Duplicated rather than imported
// because this script runs outside Next.js (no "server-only" module graph) —
// same hand-sync situation as the worker's copies of lib/ai-limits.ts.
function isEntitled(status: string, createdAt: Date): boolean {
  const trialEndsAt = createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000
  if (status === "none") return Date.now() < trialEndsAt
  return ENTITLED_STATUSES.includes(status)
}

async function uploadToStorage(path: string, bytes: Buffer): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY must be set — see .env.local",
    )
  }

  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/${DOCUMENTS_BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/pdf",
        "x-upsert": "false",
      },
      body: new Uint8Array(bytes),
    },
  )

  if (!response.ok) {
    throw new Error(
      `Storage upload failed: ${response.status} ${response.statusText} — ${await response.text()}`,
    )
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL is not set")

  const fileInfo = await stat(args.pdfPath)
  if (fileInfo.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`${args.pdfPath} is larger than the app's 500 MB upload limit.`)
  }
  const bytes = await readFile(args.pdfPath)
  // The app only accepts application/pdf (both here and at the Storage
  // bucket level), so check the magic bytes rather than trusting the
  // extension — a mislabelled file would otherwise fail deep in the worker.
  if (bytes.subarray(0, 4).toString("latin1") !== "%PDF") {
    throw new Error(`${args.pdfPath} doesn't look like a PDF (no %PDF header).`)
  }

  const sql = postgres(connectionString, { prepare: false })

  try {
    const orgs = args.org
      ? await sql`select id, slug, name, subscription_status, created_at from public.org where slug = ${args.org}`
      : await sql`select id, slug, name, subscription_status, created_at from public.org`
    if (orgs.length === 0) {
      throw new Error(args.org ? `No org with slug "${args.org}".` : "No orgs exist yet.")
    }
    if (orgs.length > 1) {
      throw new Error(
        `Multiple orgs exist (${orgs.map((o) => o.slug).join(", ")}) — pass one with --org.`,
      )
    }
    const org = orgs[0]

    if (!isEntitled(org.subscription_status, org.created_at)) {
      throw new Error(
        `Org "${org.name}" isn't entitled (subscription_status=${org.subscription_status}) — the app would refuse to queue this job too.`,
      )
    }

    const projects = args.project
      ? await sql`select id, number, name from public.project where org_id = ${org.id} and number = ${args.project}`
      : await sql`select id, number, name from public.project where org_id = ${org.id}`
    if (projects.length === 0) {
      throw new Error(
        args.project
          ? `No project #${args.project} for org "${org.name}".`
          : `Org "${org.name}" has no projects.`,
      )
    }
    if (projects.length > 1) {
      throw new Error(
        `Multiple projects (${projects.map((p) => `#${p.number}`).join(", ")}) — pass one with --project.`,
      )
    }
    const project = projects[0]

    // Same sanitizing and layout as app/upload/actions.ts's
    // requestDocumentUpload — the org-id prefix in particular is load-bearing:
    // worker/src/process-job.ts refuses to download a path that doesn't start
    // with the job's own org.
    const safeName = basename(args.pdfPath).replace(/[^a-zA-Z0-9._-]/g, "_")
    const storagePath = `${org.id}/${project.id}/${randomUUID()}-${safeName}`

    console.log(`Org      : ${org.name} (${org.slug})`)
    console.log(`Project  : ${project.name} (#${project.number})`)
    console.log(`File     : ${args.pdfPath} (${(fileInfo.size / 1024).toFixed(0)} KB, type=${args.type})`)
    console.log(`Uploading to ${DOCUMENTS_BUCKET}/${storagePath} ...`)

    await uploadToStorage(storagePath, bytes)

    const [document] = await sql`
      insert into public.document (
        org_id, project_id, type, file_name, storage_bucket, storage_path,
        mime_type, file_size_bytes, status
      ) values (
        ${org.id}, ${project.id}, ${args.type}, ${basename(args.pdfPath)},
        ${DOCUMENTS_BUCKET}, ${storagePath}, 'application/pdf', ${fileInfo.size},
        'uploaded'
      )
      returning id
    `
    // The worker's plan_holders branch updates plan_holder_list's status as
    // the job moves, and app/plan-holders/actions.ts materializes contacts
    // from the list row on first read of the review screen. Without this row
    // those updates are silent no-ops: the extraction still lands in
    // takeoff_job.result, but nothing is reviewable in the app, which is half
    // of what a real-path test is for.
    if (args.type === "plan_holders") {
      const [list] = await sql`
        insert into public.plan_holder_list (
          org_id, project_id, document_id, source_label, status
        ) values (
          ${org.id}, ${project.id}, ${document.id}, ${args.label!}, 'uploaded'
        )
        returning id
      `
      console.log(`List     : ${list.id} (${args.label})`)
    }

    const [job] = await sql`
      insert into public.takeoff_job (org_id, document_id, status)
      values (${org.id}, ${document.id}, 'queued')
      returning id
    `

    console.log(`Document : ${document.id}`)
    console.log(`Job      : ${job.id} (queued)`)

    if (!args.wait) {
      console.log("\nQueued. Re-run with compare.ts once a worker has processed it.")
      return
    }

    console.log(`\nWaiting for a worker to process it (timeout ${args.timeoutSeconds}s) ...`)
    const deadline = Date.now() + args.timeoutSeconds * 1000
    let lastStatus = "queued"

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 3000))
      const [row] = await sql`
        select status, error, result from public.takeoff_job where id = ${job.id}
      `
      if (row.status !== lastStatus) {
        console.log(`  ${lastStatus} -> ${row.status}`)
        lastStatus = row.status
      }
      if (row.status === "failed") {
        console.error(`\nJob failed: ${row.error}`)
        process.exitCode = 1
        return
      }
      if (row.status === "complete") {
        // A roster has no bid items to compare, so compare.ts has nothing to
        // say about it. What a reader test needs instead is the first few
        // rows printed here, beside the source document, so the parse can be
        // eyeballed straight away.
        if (row.result?.kind === "plan_holders") {
          const holders = row.result?.planHolders ?? []
          console.log(`\nComplete — extracted ${holders.length} plan holders.`)
          if (row.result?.planHoldersIssuedOn) {
            console.log(`Issued on: ${row.result.planHoldersIssuedOn}`)
          }
          if (row.result?.documentNotes) {
            console.log(`Notes    : ${row.result.documentNotes}`)
          }
          for (const holder of holders.slice(0, 5)) {
            const parsed = [holder.contactName, holder.city, holder.phone, holder.licenseNumber]
              .filter(Boolean)
              .join(" | ")
            console.log(`\n  ${holder.companyName}${parsed ? `\n    ${parsed}` : ""}`)
            console.log(`    raw: ${holder.rawText?.replace(/\s+/g, " ").slice(0, 120)}`)
          }
          if (holders.length > 5) console.log(`\n  ... and ${holders.length - 5} more.`)
          console.log("\nNext: open /plan-holders in the app to review the full list.")
          return
        }

        const extracted = row.result?.bidItems ?? row.result?.items ?? []
        console.log(`\nComplete — extracted ${extracted.length} items (kind=${row.result?.kind ?? "plan_takeoff"}).`)
        console.log(
          `\nNext: node --env-file=.env.local scripts/real-job/compare.ts --document ${document.id} --expected <your-known-correct.csv>`,
        )
        return
      }
    }

    console.error(
      `\nStill ${lastStatus} after ${args.timeoutSeconds}s. Is a worker running? (cd worker && npm run dev)`,
    )
    process.exitCode = 1
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
