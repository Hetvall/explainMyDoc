"use client";

import * as React from "react";
import { Loader2, GraduationCap, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";

type Difficulty = "easy" | "medium" | "hard";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface Quiz {
  id: string;
  questions: QuizQuestion[];
}

interface AttemptResult {
  score: number;
  total: number;
  percentage: number;
  weakAreas: string[];
  answers: { questionId: string; selectedAnswer: string; correct: boolean }[];
}

type Stage = "config" | "generating" | "taking" | "result";

export function QuizPanel({ documentId }: { documentId: string }) {
  const [stage, setStage] = React.useState<Stage>("config");
  const [difficulty, setDifficulty] = React.useState<Difficulty>("medium");
  const [questionCount, setQuestionCount] = React.useState(5);
  const [quiz, setQuiz] = React.useState<Quiz | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<AttemptResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function generateQuiz() {
    setStage("generating");
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty, questionCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't generate a quiz.");
      if (!Array.isArray(data.quiz?.questions)) {
        throw new Error("The quiz came back in an unexpected format. Please try again.");
      }
      setQuiz(data.quiz);
      setAnswers({});
      setStage("taking");
    } catch (err) {
      setError((err as Error).message);
      setStage("config");
    }
  }

  async function submitQuiz() {
    if (!quiz) return;
    try {
      const res = await fetch(`/api/documents/${documentId}/quiz/${quiz.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, selectedAnswer]) => ({
            questionId,
            selectedAnswer,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't submit the quiz.");
      setResult(data);
      setStage("result");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (stage === "config") {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-foreground-muted">
          <GraduationCap className="size-4" />
          <p className="text-sm">Test what you remember from this document.</p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div>
          <p className="mb-1.5 text-xs font-medium text-foreground-muted">Number of questions</p>
          <div className="flex gap-2">
            {[5, 10, 15].map((n) => (
              <button
                key={n}
                onClick={() => setQuestionCount(n)}
                className={cn(
                  "flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors",
                  questionCount === n
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-border hover:bg-surface-muted",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-foreground-muted">Difficulty</p>
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button className="w-full" onClick={generateQuiz}>
          Generate quiz
        </Button>
      </div>
    );
  }

  if (stage === "generating") {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-foreground-muted">
        <Loader2 className="size-5 animate-spin text-brand" />
        Preparing your quiz…
      </div>
    );
  }

  if (stage === "taking" && quiz) {
    const allAnswered = quiz.questions.every((q) => answers[q.id]);
    return (
      <div className="space-y-6">
        {quiz.questions.map((q, i) => (
          <div key={q.id}>
            <p className="mb-2 text-sm font-medium">
              {i + 1}. {q.question}
            </p>
            <div className="space-y-1.5">
              {(q.options ?? []).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                  className={cn(
                    "block w-full rounded-md border px-3 py-2 text-left text-sm transition-colors",
                    answers[q.id] === opt
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-border hover:bg-surface-muted",
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
        <Button className="w-full" disabled={!allAnswered} onClick={submitQuiz}>
          Submit quiz ({Object.keys(answers).length}/{quiz.questions.length} answered)
        </Button>
      </div>
    );
  }

  if (stage === "result" && result && quiz) {
    return (
      <div className="space-y-5">
        <div className="rounded-md border border-border bg-surface-muted p-5 text-center">
          <p className="font-serif text-3xl font-semibold">{result.percentage}%</p>
          <p className="mt-1 text-sm text-foreground-muted">
            {result.score} of {result.total} correct
          </p>
        </div>

        {result.weakAreas.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-foreground-subtle">
              Review these topics
            </p>
            <ul className="space-y-1 text-sm text-foreground-muted">
              {result.weakAreas.slice(0, 5).map((w, i) => (
                <li key={i}>· {w}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          {quiz.questions.map((q) => {
            const a = result.answers.find((ans) => ans.questionId === q.id);
            return (
              <div key={q.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-start gap-2">
                  {a?.correct ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-danger" />
                  )}
                  <div>
                    <p className="font-medium">{q.question}</p>
                    <p className="mt-1 text-foreground-muted">
                      Correct answer: <span className="text-foreground">{q.correctAnswer}</span>
                    </p>
                    <p className="mt-1 text-xs text-foreground-subtle">{q.explanation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button variant="secondary" className="w-full" onClick={() => setStage("config")}>
          <RotateCcw className="size-3.5" />
          Take another quiz
        </Button>
      </div>
    );
  }

  return null;
}
