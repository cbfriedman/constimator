"use server"

import { getScopedDb } from "@/lib/db/scoped"

export type CreateProjectInput = {
  name: string
  owner: string
  number: string
  bidDate: string
  engineersEstimate: string
  location: string
  projectType: string
}

export async function createProject(input: CreateProjectInput) {
  const name = input.name.trim()
  if (!name) {
    throw new Error("Project name is required")
  }

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
