"use server"

import { eq, inArray } from "drizzle-orm"

import { documents, takeoffJobs } from "@/db/schema"
import { getCurrentProject } from "@/lib/current-project"
import { getScopedDb } from "@/lib/db/scoped"
import { formatDisplayDate } from "@/lib/format-date"

export type ExtractedItemView = {
  trade: string
  description: string
  quantity: number
  unit: string
  confidence: number | null
  sourceSheets: string | null
  notes: string | null
  documentName: string
}

export type DocumentView = {
  id: string
  fileName: string
  type: string
  status: string
}

export type IntelligenceProjectView = {
  id: string
  name: string
  number: string
  owner: string
  location: string | null
  projectType: string | null
  bidDate: string | null
  engineersEstimate: string | null
  workingDays: number | null
  liquidatedDamagesPerDay: string | null
  prevailingWage: boolean
}

export type IntelligenceData = {
  project: IntelligenceProjectView | null
  documents: DocumentView[]
  items: ExtractedItemView[]
}

function formatCurrency(value: string | null): string | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isNaN(n) ? null : `$${Math.round(n).toLocaleString("en-US")}`
}

export async function getIntelligenceData(): Promise<IntelligenceData> {
  const scopedDb = await getScopedDb()
  const project = await getCurrentProject(scopedDb)

  if (!project) {
    return { project: null, documents: [], items: [] }
  }

  const docRows = await scopedDb.documents.findMany(eq(documents.projectId, project.id))

  const jobRows =
    docRows.length > 0
      ? await scopedDb.takeoffJobs.findMany(
          inArray(
            takeoffJobs.documentId,
            docRows.map((d) => d.id),
          ),
        )
      : []

  // A document can have more than one job row (e.g. after a retry) — only
  // the most recent complete one per document contributes items, same
  // "latest wins" rule app/processing/actions.ts uses.
  const latestByDocument = new Map<string, (typeof jobRows)[number]>()
  for (const job of jobRows) {
    const current = latestByDocument.get(job.documentId)
    if (!current || job.createdAt.getTime() > current.createdAt.getTime()) {
      latestByDocument.set(job.documentId, job)
    }
  }

  const items: ExtractedItemView[] = [...latestByDocument.values()]
    .filter((job) => job.status === "complete" && job.result)
    .flatMap((job) => {
      const doc = docRows.find((d) => d.id === job.documentId)
      return (job.result?.items ?? []).map((item) => ({
        trade: item.trade,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        confidence: item.confidence ?? null,
        sourceSheets: item.sourceSheets ?? null,
        notes: item.notes ?? null,
        documentName: doc?.fileName ?? "Unknown document",
      }))
    })

  return {
    project: {
      id: project.id,
      name: project.name,
      number: project.number,
      owner: project.owner,
      location: project.location,
      projectType: project.projectType,
      bidDate: project.bidDate ? formatDisplayDate(project.bidDate) : null,
      engineersEstimate: formatCurrency(project.engineersEstimate),
      workingDays: project.workingDays,
      liquidatedDamagesPerDay: project.liquidatedDamagesPerDay
        ? `${formatCurrency(project.liquidatedDamagesPerDay)}/day`
        : null,
      prevailingWage: project.prevailingWage,
    },
    documents: docRows.map((d) => ({
      id: d.id,
      fileName: d.fileName,
      type: d.type,
      status: d.status,
    })),
    items,
  }
}
