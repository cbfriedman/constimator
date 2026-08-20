"use server"

import { eq } from "drizzle-orm"
import { z } from "zod"

import { projects, reviewRequests } from "@/db/schema"
import { getCurrentProject } from "@/lib/current-project"
import { getScopedDb } from "@/lib/db/scoped"
import { sendReviewRequestNotification } from "@/lib/email/review-request"
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

  // Found during a pre-launch audit: this used to insert with a raw
  // client-supplied projectId and no ownership check at all — worse than
  // the same bug class already fixed elsewhere (addBidLineAction,
  // confirmDocumentUpload), since review_request.org_id would still be
  // stamped as the caller's own org while project_id pointed at literally
  // any project id, including another org's. Same fix: confirm the
  // project is actually the caller's own before referencing it.
  const project = await scopedDb.projects.findFirst(eq(projects.id, input.projectId))
  if (!project) {
    throw new Error("Project not found.")
  }

  const [request] = await scopedDb.reviewRequests.insert({
    projectId: input.projectId,
    requestedBy: scopedDb.userId,
    scope: input.scope,
    notes: input.notes || null,
    status: "requested",
  })

  // Without this the row was the whole feature — nothing read it, so the
  // "we'll follow up within 1–2 business days" the UI shows was a promise
  // no one could keep. Awaited rather than fired-and-forgotten so a Vercel
  // function can't be torn down mid-send; it never throws, so a mail
  // failure still leaves the contractor with a saved request rather than
  // an error (see lib/email/review-request.ts).
  await sendReviewRequestNotification(scopedDb, {
    id: request.id,
    projectName: project.name,
    projectNumber: project.number,
    scope: input.scope,
    notes: request.notes,
  })

  return request
}
