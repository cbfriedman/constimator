import { eq } from "drizzle-orm"

import type { DbDocType } from "@/app/upload/actions"
import type { UploadDoc } from "@/components/upload/documents-table"
import { NoProjectState } from "@/components/no-project-state"
import { UploadShell } from "@/components/upload/upload-shell"
import { documents, projects } from "@/db/schema"
import { getScopedDb } from "@/lib/db/scoped"

const DB_TO_UI_TYPE: Record<DbDocType, UploadDoc["type"]> = {
  plans: "Plans",
  specifications: "Specifications",
  addendum: "Addendum",
  bid_form: "Official Bid Form",
  sub_quote: "Sub Quote",
  plan_holders: "Plan Holders",
  other: "Supporting Document",
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "—"
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const { project: projectId } = await searchParams

  if (!projectId) {
    return (
      <NoProjectState
        title="No project selected"
        description="Open Upload from a project instead of visiting this page directly."
      />
    )
  }

  const scopedDb = await getScopedDb()
  const project = await scopedDb.projects.findFirst(eq(projects.id, projectId))

  if (!project) {
    return (
      <NoProjectState
        title="Project not found"
        description="This project doesn't exist, or isn't part of your organization."
      />
    )
  }

  const rows = await scopedDb.documents.findMany(eq(documents.projectId, projectId))
  const initialDocs: UploadDoc[] = rows.map((row) => ({
    id: row.id,
    file: row.fileName,
    type: DB_TO_UI_TYPE[row.type],
    pages: "—",
    size: formatSize(row.fileSizeBytes),
    status: "uploaded",
  }))

  return (
    <UploadShell
      projectId={project.id}
      projectName={project.name}
      initialDocs={initialDocs}
    />
  )
}
