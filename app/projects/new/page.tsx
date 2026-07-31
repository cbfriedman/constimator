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
import { demoProject } from "@/lib/mock-data"
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
  const [name, setName] = useState(demoProject.name)
  const [nameError, setNameError] = useState(false)
  const [owner, setOwner] = useState(demoProject.owner)
  const [number, setNumber] = useState(demoProject.number)
  // demoProject only has formatted display strings for its bid date — this
  // is the same date ("Aug 22, 2026") as a real <input type="date"> value.
  const [bidDate, setBidDate] = useState("2026-08-22")
  const [engineersEstimate, setEngineersEstimate] = useState(
    demoProject.engineersEstimate,
  )
  const [location, setLocation] = useState(demoProject.location)
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
          Prefill shows the Shasta demo project. You can change any field.
        </p>
      </header>

      <Card>
        <CardContent className="pt-6">
          <FieldGroup>
            <Field data-invalid={nameError || undefined}>
              <FieldLabel htmlFor="project-name">Project Name</FieldLabel>
              <Input
                id="project-name"
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
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="project-number">Project Number</FieldLabel>
              <Input
                id="project-number"
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
                value={engineersEstimate}
                onChange={(e) => setEngineersEstimate(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="location">Location</FieldLabel>
              <Input
                id="location"
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
                defaultValue="Prevailing wage. One addendum issued to date."
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
