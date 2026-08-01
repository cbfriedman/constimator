"use server"

import { z } from "zod"

import { getScopedDb } from "@/lib/db/scoped"
import { parseInput } from "@/lib/validation"

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required"),
  owner: z.string(),
  number: z.string(),
  // Native <input type="date">'s value — either empty or YYYY-MM-DD.
  bidDate: z.string().refine(
    (v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v),
    "must be a YYYY-MM-DD date",
  ),
  // Deliberately not required to be numeric here — the UI accepts loosely
  // formatted input ("$1,200,000") and strips non-digits below, same as
  // before this schema existed. Just has to be a string.
  engineersEstimate: z.string(),
  location: z.string(),
  projectType: z.string(),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>

export async function createProject(rawInput: CreateProjectInput) {
  const input = parseInput(createProjectSchema, rawInput)
  const name = input.name

  const engineersEstimate = input.engineersEstimate.replace(/[^0-9.]/g, "")

  const scopedDb = await getScopedDb()
  const [project] = await scopedDb.projects.insert({
    name,
    owner: input.owner.trim(),
    number: input.number.trim(),
    bidDate: input.bidDate || null,
    engineersEstimate: engineersEstimate || null,
    location: input.location.trim() || null,
    projectType: input.projectType || null,
    status: "draft",
  })

  return project
}
