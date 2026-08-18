import Link from "next/link";
import { ArrowRight, FileStack, MessageSquareText, Sparkles, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    n: "01",
    title: "Upload",
    description: "Drop in a PDF or text file — a report, a paper, a contract, lecture notes.",
    icon: FileStack,
  },
  {
    n: "02",
    title: "Understand",
    description: "Get a structured summary: TL;DR, key points, concepts, and action items.",
    icon: Sparkles,
  },
  {
    n: "03",
    title: "Ask",
    description: "Chat with the document. Answers are grounded in its actual content, with sources.",
    icon: MessageSquareText,
  },
  {
    n: "04",
    title: "Practice",
    description: "Generate a quiz or flashcards to check what actually stuck.",
    icon: GraduationCap,
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-brand text-brand-foreground">
            <FileStack className="size-4" />
          </span>
          <span className="font-serif text-base tracking-tight">ExplainMyDoc</span>
        </Link>
        <Button asChild variant="secondary" size="sm">
          <Link href="/dashboard">Open dashboard</Link>
        </Button>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 pt-14 pb-10 text-center sm:px-6 sm:pt-20">
          <h1 className="animate-in-fade font-serif text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Understand{" "}
            <span className="highlight-mark">any document</span> in minutes.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-foreground-muted text-balance">
            Upload a PDF, get the important information, ask questions, generate
            quizzes, and turn dense documents into something you can actually
            understand.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Upload your first document
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 sm:px-6">
          <ProductPreview />
        </section>

        <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.n} className="rounded-md border border-border bg-surface p-5">
                <div className="flex items-center gap-2 text-xs font-mono text-foreground-subtle">
                  {step.n}
                </div>
                <div className="mt-3 flex size-9 items-center justify-center rounded-md bg-brand-soft text-brand">
                  <step.icon className="size-4" />
                </div>
                <h3 className="mt-3 font-medium">{step.title}</h3>
                <p className="mt-1 text-sm text-foreground-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-foreground-subtle">
        ExplainMyDoc — turn passive documents into understanding.
      </footer>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="animate-in-fade overflow-hidden rounded-md border border-border bg-surface shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-danger/40" />
        <span className="size-2.5 rounded-full bg-warning/40" />
        <span className="size-2.5 rounded-full bg-success/40" />
        <span className="ml-2 truncate font-mono text-xs text-foreground-subtle">
          Quarterly-Report-Q3.pdf
        </span>
      </div>
      <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-[1fr_1.4fr]">
        <div className="space-y-3 bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">
            TL;DR
          </p>
          <p className="text-sm leading-relaxed text-foreground-muted">
            Revenue grew <span className="highlight-mark">18% quarter-over-quarter</span>,
            driven mainly by the new enterprise tier. Two risks are flagged for
            next quarter.
          </p>
          <p className="pt-2 text-xs font-medium uppercase tracking-wide text-foreground-subtle">
            Key points
          </p>
          <ul className="space-y-1.5 text-sm text-foreground-muted">
            <li>· Enterprise tier now 34% of revenue</li>
            <li>· Churn down 2.1pp from Q2</li>
            <li>· Hiring plan needs board approval</li>
          </ul>
        </div>
        <div className="space-y-3 bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">
            Ask this document
          </p>
          <div className="rounded-md bg-surface-muted p-3 text-sm">
            What does the report recommend for next quarter?
          </div>
          <div className="rounded-md border border-brand-soft bg-brand-soft/40 p-3 text-sm text-foreground">
            It recommends prioritizing enterprise onboarding and addressing the
            two flagged supply risks before scaling further.
            <div className="mt-2 font-mono text-xs text-brand">Source: page 4</div>
          </div>
        </div>
      </div>
    </div>
  );
}
