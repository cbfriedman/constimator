"use server"

import { ilike, or } from "drizzle-orm"

import { bids, documents, estimateLines, projects } from "@/db/schema"
import { getScopedDb } from "@/lib/db/scoped"
import { withProjectQuery } from "@/lib/project-scope"

export type SearchHit = {
  id: string
  kind: "project" | "document" | "estimate" | "bid"
  title: string
  subtitle: string
  href: string
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

export async function searchWorkspaceAction(rawQuery: string): Promise<SearchHit[]> {
  const query = rawQuery.trim()
  if (query.length < 2) return []

  const pattern = `%${escapeIlike(query)}%`
  const scopedDb = await getScopedDb()

  const [projectRows, documentRows, estimateRows, bidRows] = await Promise.all([
    scopedDb.projects.findMany(ilike(projects.name, pattern), { limit: 8 }),
    scopedDb.documents.findMany(ilike(documents.fileName, pattern), { limit: 8 }),
    scopedDb.estimateLines.findMany(ilike(estimateLines.description, pattern), {
      limit: 8,
    }),
    scopedDb.bids.findMany(
      or(ilike(bids.description, pattern), ilike(bids.itemNumber, pattern)),
      { limit: 8 },
    ),
  ])

  const hits: SearchHit[] = []

  for (const project of projectRows) {
    hits.push({
      id: project.id,
      kind: "project",
      title: project.name,
      subtitle: `#${project.number}`,
      href: withProjectQuery("/intelligence", project.id),
    })
  }

  const projectById = new Map(
    (await scopedDb.projects.findMany()).map((row) => [row.id, row]),
  )

  for (const document of documentRows) {
    const project = projectById.get(document.projectId)
    hits.push({
      id: document.id,
      kind: "document",
      title: document.fileName,
      subtitle: project ? `${project.name} · #${project.number}` : "Document",
      href: withProjectQuery("/upload", document.projectId),
    })
  }

  const estimatesById = new Map(
    (await scopedDb.estimates.findMany()).map((row) => [row.id, row]),
  )
  for (const line of estimateRows) {
    const estimate = estimatesById.get(line.estimateId)
    const project = estimate ? projectById.get(estimate.projectId) : undefined
    hits.push({
      id: line.id,
      kind: "estimate",
      title: line.description,
      subtitle: project
        ? `Estimate · ${project.name}`
        : "Estimate line",
      href: withProjectQuery("/estimate", estimate?.projectId ?? null),
    })
  }

  for (const bid of bidRows) {
    const project = projectById.get(bid.projectId)
    hits.push({
      id: bid.id,
      kind: "bid",
      title: `${bid.itemNumber} · ${bid.description}`,
      subtitle: project ? `Bid form · ${project.name}` : "Bid form item",
      href: withProjectQuery("/reconciliation", bid.projectId),
    })
  }

  return hits.slice(0, 20)
}
