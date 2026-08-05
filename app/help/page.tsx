import Link from "next/link"
import { Mail, MessageCircleQuestion } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProjectHeader } from "@/components/project-header"

const faqs = [
  {
    question: "What happens when I upload a document?",
    answer:
      "Constimator queues it for AI extraction, run by a background worker — usually done within a minute or two. Check the AI Processing page for status; if a document fails, you can retry it without re-uploading.",
  },
  {
    question: "Why does Bid Reconciliation say a project isn't wired up yet?",
    answer:
      "Cost Setup, Estimate, Bid Reconciliation, Reports, and Schedules currently all operate on your organization's most recently created project — not whichever one you click on the dashboard. This is a known, temporary limitation while multi-project support is still being built.",
  },
  {
    question: "How is my AI usage cost controlled?",
    answer:
      "Every org has a monthly AI spend limit (Settings → Monthly AI usage limit, $20 by default). Once your org crosses it, document processing pauses until the next month — you can still build your estimate manually in the meantime.",
  },
  {
    question: "Is this a real product with real data?",
    answer:
      "Yes — accounts, documents, estimates, and reconciliation are all real and stored in your own organization's data. The honesty banner at the top of the app just means this is an early-stage product still being built and validated, not that the data is fake.",
  },
]

export default function HelpPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-8">
      <ProjectHeader title="Help" subtitle="Common questions and how to reach us." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact support</CardTitle>
          <CardDescription>
            Run into something broken or confusing? We&apos;d genuinely like to
            know.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="mailto:support@constimator.com" />}>
            <Mail data-icon="inline-start" />
            support@constimator.com
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircleQuestion className="size-4 text-muted-foreground" />
            Frequently asked questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col divide-y">
            {faqs.map((faq) => (
              <div key={faq.question} className="flex flex-col gap-1.5 py-4 first:pt-0 last:pb-0">
                <dt className="text-sm font-medium text-foreground">{faq.question}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
