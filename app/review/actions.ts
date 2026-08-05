"use server"

import { eq } from "drizzle-orm"
import { z } from "zod"

import { reviewRequests } from "@/db/schema"
import { getCurrentProject } from "@/lib/current-project"
import { getScopedDb } from "@/lib/db/scoped"
import { parseInput } from "@/lib/validation"

const scopeSchema = z.enum(["full", "reconciliation", "discrepancy", "proposal"])

export async function getReviewData() {
  const scopedDb = await getScopedDb()
  const project = await getCurrentProject(scopedDb)
  if (!project) return { project: null, latestRequest: null }

  const requests = await scopedDb.reviewRequests.findMany(
    eq(reviewRequests.projectId, project.id),
  )
  const latestRequest =
    requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null

  return {
    project: { id: project.id, name: project.name, number: project.number },
    latestRequest,
  }
}

const requestReviewSchema = z.object({
  projectId: z.string().uuid(),
  scope: z.array(scopeSchema).min(1, "Select at least one review scope"),
  notes: z.string().trim().max(2000).optional(),
})

export async function requestReviewAction(rawInput: {
  projectId: string
  scope: string[]
  notes?: string
}) {
  const input = parseInput(requestReviewSchema, rawInput)
  const scopedDb = await getScopedDb()

  const [request] = await scopedDb.reviewRequests.insert({
    projectId: input.projectId,
    requestedBy: scopedDb.userId,
    scope: input.scope,
    notes: input.notes || null,
    status: "requested",
  })

  return request
}
