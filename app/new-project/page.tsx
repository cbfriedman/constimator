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
  const [name, setName] = useState("Shasta County Roadway Improvements")
  const [nameError, setNameError] = useState(false)

  function handleCreate() {
    if (name.trim() === "") {
      setNameError(true)
      return
    }
    router.push("/upload")
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">New Project</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You can change any of this later.
        </p>
      </header>

      <Card>
        <CardContent className="pt-6">
          <FieldGroup>
            <Field data-invalid={nameError || undefined}>
              <FieldLabel htmlFor="project-name">Project Name *</FieldLabel>
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
              <FieldLabel htmlFor="agency">Agency / Owner *</FieldLabel>
              <Input id="agency" defaultValue="Shasta County Public Works" />
            </Field>

            <Field>
              <FieldLabel htmlFor="project-number">Project Number</FieldLabel>
              <Input id="project-number" defaultValue="24-118" />
            </Field>

            <Field orientation="responsive">
              <Field>
                <FieldLabel htmlFor="bid-date">Bid Date *</FieldLabel>
                <Input id="bid-date" defaultValue="08/22/2026" />
              </Field>
              <Field>
                <FieldLabel htmlFor="bid-time">Time</FieldLabel>
                <Input id="bid-time" defaultValue="2:00 PM PT" />
              </Field>
            </Field>

            <Field>
              <FieldLabel htmlFor="engineers-estimate">
                Engineer&apos;s Estimate
              </FieldLabel>
              <Input id="engineers-estimate" defaultValue="$1,850,000" />
            </Field>

            <Field>
              <FieldLabel htmlFor="project-type">Project Type</FieldLabel>
              <Select defaultValue="Roadway">
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
              <FieldLabel htmlFor="location">Location</FieldLabel>
              <Input id="location" defaultValue="Shasta County, CA" />
            </Field>

            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea
                id="notes"
                rows={3}
                defaultValue="Prevailing wage. One addendum issued to date."
              />
              <FieldDescription>Optional.</FieldDescription>
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

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Cancel
        </Button>
        <Button onClick={handleCreate}>Create Project &amp; Upload Documents</Button>
      </div>
    </div>
  )
}
