"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createProject } from "./actions"

const projectTypes = [
  "Roadway",
  "Water/Sewer",
  "Grading",
  "Concrete",
  "Bridge",
  "Site Work",
  "Other",
]

export default function NewProjectPage() {
  const router = useRouter()
  // Found during a pre-launch audit: these used to default to the Shasta
  // demo project's real values (pre-filled, not just placeholder text) —
  // a real user who didn't notice and clicking straight through would
  // create a duplicate fake "Shasta County Roadway Improvements #24-118"
  // project. Starts genuinely empty now; the placeholder= attributes below
  // still show that same example so the format is obvious.
  const [name, setName] = useState("")
  const [nameError, setNameError] = useState(false)
  const [owner, setOwner] = useState("")
  const [number, setNumber] = useState("")
  const [bidDate, setBidDate] = useState("")
  const [engineersEstimate, setEngineersEstimate] = useState("")
  const [location, setLocation] = useState("")
  const [projectType, setProjectType] = useState("Roadway")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleContinue() {
    if (name.trim() === "") {
      setNameError(true)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const project = await createProject({
        name,
        owner,
        number,
        bidDate,
        engineersEstimate,
        location,
        projectType,
      })
      router.push(`/upload?project=${project.id}`)
    } catch {
      setSubmitError("Something went wrong creating the project. Try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">New Project</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Basic bid info to get started — you can fill in the rest later.
        </p>
      </header>

      <Card>
        <CardContent className="pt-6">
          <FieldGroup>
            <Field data-invalid={nameError || undefined}>
              <FieldLabel htmlFor="project-name">Project Name</FieldLabel>
              <Input
                id="project-name"
                placeholder="e.g. Shasta County Roadway Improvements"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (nameError) setNameError(false)
                }}
                aria-invalid={nameError || undefined}
              />
              {nameError ? (
                <FieldError>
                  Give this project a name so you can find it later.
                </FieldError>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="agency">Agency / Owner</FieldLabel>
              <Input
                id="agency"
                placeholder="e.g. Shasta County Public Works"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="project-number">Project Number</FieldLabel>
              <Input
                id="project-number"
                placeholder="e.g. 24-118"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="bid-date">Bid Date</FieldLabel>
              <Input
                id="bid-date"
                type="date"
                value={bidDate}
                onChange={(e) => setBidDate(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="engineers-estimate">
                Engineer&apos;s Estimate
              </FieldLabel>
              <Input
                id="engineers-estimate"
                placeholder="e.g. $1,850,000"
                value={engineersEstimate}
                onChange={(e) => setEngineersEstimate(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="location">Location</FieldLabel>
              <Input
                id="location"
                placeholder="e.g. Shasta County, CA"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="project-type">Project Type</FieldLabel>
              <Select
                value={projectType}
                onValueChange={(value) => setProjectType(value ?? "Roadway")}
              >
                <SelectTrigger id="project-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {projectTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea
                id="notes"
                rows={3}
                placeholder="e.g. Prevailing wage. One addendum issued to date."
              />
              <FieldDescription>
                Optional. Not saved yet — there&apos;s no notes field on the
                project record.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          <span className="font-medium">Next step:</span> upload plans, specs,
          addenda, and the official bid form.
        </p>
      </div>

      {submitError ? (
        <p className="mt-4 text-sm text-destructive">{submitError}</p>
      ) : null}

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => router.push("/projects")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button onClick={handleContinue} disabled={isSubmitting}>
          {isSubmitting ? "Creating…" : "Continue to Upload Documents"}
        </Button>
      </div>
    </div>
  )
}
