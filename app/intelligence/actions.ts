"use server"

import { eq, inArray } from "drizzle-orm"

import { documents, takeoffJobs } from "@/db/schema"
import { getCurrentProject } from "@/lib/current-project"
import { getScopedDb } from "@/lib/db/scoped"
import { formatDisplayDate } from "@/lib/format-date"
import { safeSpecUrl } from "@/lib/spec-links"

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

// One participation requirement read off the specifications, ready to show.
// `goal` is null when the specs impose a requirement without a percentage —
// a race-neutral goal, a good-faith-effort-only clause, an explicit "no goal
// has been established". That is a real answer the specs give, not missing
// data, so it renders as its own state rather than being filtered out.
export type ParticipationGoalView = {
  program: string
  goal: string | null
  appliesTo: string | null
  rawText: string
  notes: string | null
  documentName: string
  sourcePage: number | null
}

// A link the specs printed beside the participation requirement. `url` has
// already been through safeSpecUrl, so it is safe to put in an href.
export type SpecLinkView = {
  url: string
  label: string
  documentName: string
}

export type IntelligenceData = {
  project: IntelligenceProjectView | null
  documents: DocumentView[]
  items: ExtractedItemView[]
  participationGoals: ParticipationGoalView[]
  specLinks: SpecLinkView[]
  // Whether any specifications document has actually been read yet. It's what
  // separates "the specs set no goal" from "nobody has looked at the specs",
  // which the summary has to say differently — a bidder acting on the first
  // when it's really the second has skipped a requirement.
  specsAnalyzed: boolean
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
    return {
      project: null,
      documents: [],
      items: [],
      participationGoals: [],
      specLinks: [],
      specsAnalyzed: false,
    }
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

  const completeJobs = [...latestByDocument.values()].filter(
    (job) => job.status === "complete" && job.result,
  )

  const items: ExtractedItemView[] = completeJobs
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

  // The specifications extractor's output (worker/src/extract-participation-
  // goals.ts) is read straight out of takeoff_job.result rather than
  // materialized into rows the way quote conditions and plan holders are.
  // There's no review gate to confirm it into: this is read-only reference a
  // bidder checks against the specs themselves, not data anything downstream
  // computes from.
  const specJobs = completeJobs.filter((job) => job.result?.kind === "specifications")

  const participationGoals: ParticipationGoalView[] = specJobs.flatMap((job) => {
    const documentName =
      docRows.find((d) => d.id === job.documentId)?.fileName ?? "Unknown document"
    return (job.result?.participationGoals ?? []).map((goal) => ({
      program: goal.program,
      goal: goal.goalPercent != null ? `${goal.goalPercent}%` : null,
      appliesTo: goal.appliesTo ?? null,
      rawText: goal.rawText,
      notes: goal.notes ?? null,
      documentName,
      sourcePage: goal.sourcePage ?? null,
    }))
  })

  // Dropping links safeSpecUrl won't vouch for, and de-duplicating: specs
  // print the same directory address in several sections, and once the
  // punctuation around it is stripped those collapse to one link.
  const seenUrls = new Set<string>()
  const specLinks: SpecLinkView[] = specJobs.flatMap((job) => {
    const documentName =
      docRows.find((d) => d.id === job.documentId)?.fileName ?? "Unknown document"
    return (job.result?.specLinks ?? []).flatMap((link) => {
      const url = safeSpecUrl(link.url)
      if (!url || seenUrls.has(url)) return []
      seenUrls.add(url)
      return [{ url, label: link.label, documentName }]
    })
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
    participationGoals,
    specLinks,
    specsAnalyzed: specJobs.length > 0,
  }
}
