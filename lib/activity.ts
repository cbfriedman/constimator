import "server-only"

import { desc, inArray } from "drizzle-orm"

import { documents, estimates, projects, reconciliationItems } from "@/db/schema"
import type { ScopedDb } from "@/lib/current-project"

// The dashboard's Recent Activity panel used to render a hardcoded array
// from lib/mock-data.ts — the same three lines about a Shasta County job,
// shown to every org that ever signed in, including ones that had never
// created a project. This derives the same three *kinds* of entry the
// panel was always meant to show (documents read, estimate updated,
// reconciliation flagged) from the org's own rows.
//
// Every query here is bounded with orderBy + limit rather than selecting
// the org's full history and sorting in JS — this panel loads on every
// dashboard render, which is exactly the shape of traffic that exhausted
// the connection pool once already (docs/DATABASE-POOLING.md).

export type ActivityItem = {
  text: string
  /** ISO timestamp; formatted for display by the component that renders it. */
  at: string
}

/** How many entries the panel shows. Each source is capped at this too, since one source can't fill more than the whole list. */
const FEED_LIMIT = 6

/** Rows whose updatedAt is within this of their createdAt haven't really been "updated" — that's just the insert's own timestamp. */
const UPDATE_EPSILON_MS = 2000

function wasUpdatedAfterCreation(row: { createdAt: Date; updatedAt: Date }): boolean {
  return row.updatedAt.getTime() - row.createdAt.getTime() > UPDATE_EPSILON_MS
}

export async function getRecentActivity(scopedDb: ScopedDb): Promise<ActivityItem[]> {
  const projectRows = await scopedDb.projects.findMany(undefined, {
    orderBy: desc(projects.createdAt),
    limit: FEED_LIMIT,
  })

  // Nothing to report before the org has a project — and skipping the
  // remaining queries entirely keeps a brand-new account's first dashboard
  // load cheap.
  if (projectRows.length === 0) return []

  const projectName = new Map(projectRows.map((row) => [row.id, row.name]))
  const projectIds = projectRows.map((row) => row.id)

  const [documentRows, estimateRows, reconciliationRows] = await Promise.all([
    scopedDb.documents.findMany(inArray(documents.projectId, projectIds), {
      orderBy: desc(documents.updatedAt),
      limit: FEED_LIMIT,
    }),
    scopedDb.estimates.findMany(inArray(estimates.projectId, projectIds), {
      orderBy: desc(estimates.updatedAt),
      limit: FEED_LIMIT,
    }),
    scopedDb.reconciliationItems.findMany(
      inArray(reconciliationItems.projectId, projectIds),
      { orderBy: desc(reconciliationItems.createdAt), limit: 200 },
    ),
  ])

  const items: ActivityItem[] = []

  for (const project of projectRows) {
    items.push({ text: `Project created — ${project.name}`, at: project.createdAt.toISOString() })
  }

  for (const document of documentRows) {
    const where = projectName.get(document.projectId) ?? "a project"
    if (document.status === "processed") {
      items.push({
        text: `Documents read — ${document.fileName} (${where})`,
        at: document.updatedAt.toISOString(),
      })
    } else if (document.status === "failed") {
      items.push({
        text: `Document processing failed — ${document.fileName} (${where})`,
        at: document.updatedAt.toISOString(),
      })
    } else {
      items.push({
        text: `Uploaded ${document.fileName} — ${where}`,
        at: document.createdAt.toISOString(),
      })
    }
  }

  for (const estimate of estimateRows) {
    if (!wasUpdatedAfterCreation(estimate)) continue
    items.push({
      text: `Estimate updated — ${projectName.get(estimate.projectId) ?? "a project"}`,
      at: estimate.updatedAt.toISOString(),
    })
  }

  // One reconciliation run writes many rows at once, so collapse them into a
  // single entry per project keyed on the newest row in that run — otherwise
  // one run of a 40-item bid form would be the entire feed.
  const runs = new Map<string, { at: Date; flagged: number }>()
  for (const row of reconciliationRows) {
    const run = runs.get(row.projectId)
    if (run) {
      if (row.attention) run.flagged += 1
      if (row.createdAt > run.at) run.at = row.createdAt
    } else {
      runs.set(row.projectId, { at: row.createdAt, flagged: row.attention ? 1 : 0 })
    }
  }
  for (const [projectId, run] of runs) {
    const where = projectName.get(projectId) ?? "a project"
    items.push({
      text:
        run.flagged > 0
          ? `Reconciliation flagged ${run.flagged} ${run.flagged === 1 ? "item" : "items"} on ${where}`
          : `Reconciliation ran clean on ${where}`,
      at: run.at.toISOString(),
    })
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, FEED_LIMIT)
}
