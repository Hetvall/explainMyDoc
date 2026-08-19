"use client";

import * as React from "react";
import { Loader2, Layers, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty: "again" | "hard" | "good" | "easy" | null;
  reviewCount: number;
}

const RATINGS: { id: "again" | "hard" | "good" | "easy"; label: string; className: string }[] = [
  { id: "again", label: "Again", className: "bg-danger-soft text-danger hover:bg-danger-soft" },
  { id: "hard", label: "Hard", className: "bg-warning-soft text-warning hover:bg-warning-soft" },
  { id: "good", label: "Good", className: "bg-brand-soft text-brand hover:bg-brand-soft" },
  { id: "easy", label: "Easy", className: "bg-success-soft text-success hover:bg-success-soft" },
];

export function FlashcardsPanel({ documentId }: { documentId: string }) {
  const [cards, setCards] = React.useState<Flashcard[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [index, setIndex] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const res = await fetch(`/api/documents/${documentId}/flashcards`);
      const data = await res.json();
      setCards(data.flashcards ?? []);
      setLoading(false);
    })();
  }, [documentId]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/flashcards`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't generate flashcards.");
      setCards(data.flashcards);
      setIndex(0);
      setFlipped(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function rate(rating: "again" | "hard" | "good" | "easy") {
    if (!cards) return;
    const card = cards[index];
    if (!card) return;
    fetch(`/api/documents/${documentId}/flashcards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    }).catch(() => {});

    setCards((prev) =>
      prev
        ? prev.map((c) =>
            c.id === card.id ? { ...c, difficulty: rating, reviewCount: c.reviewCount + 1 } : c
          )
        : prev
    );
    setFlipped(false);
    setIndex((i) => (i + 1 < cards.length ? i + 1 : i));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10 text-foreground-subtle">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="space-y-4 text-center">
        <Layers className="mx-auto size-6 text-foreground-subtle" />
        <p className="text-sm text-foreground-muted">
          Turn this document into flashcards for quick review.
        </p>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button onClick={generate} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Generating…
            </>
          ) : (
            "Generate flashcards"
          )}
        </Button>
      </div>
    );
  }

  const card = cards[index];
  const reviewed = cards.filter((c) => c.difficulty !== null).length;

  if (reviewed === cards.length) {
    return (
      <div className="space-y-4 text-center">
        <p className="font-medium">You reviewed all {cards.length} cards 🎉</p>
        <Button variant="secondary" onClick={generate} disabled={generating}>
          Generate a fresh set
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-foreground-subtle">
        <span>
          Card {index + 1} of {cards.length}
        </span>
        <span>{reviewed} reviewed</span>
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="flex min-h-40 w-full flex-col items-center justify-center gap-3 rounded-md border border-border bg-surface-muted p-6 text-center transition-colors hover:border-border-strong"
      >
        <p className={cn("text-sm leading-relaxed", flipped ? "text-foreground-muted" : "font-medium")}>
          {flipped ? card.answer : card.question}
        </p>
        <span className="flex items-center gap-1 text-xs text-foreground-subtle">
          <RotateCw className="size-3" />
          {flipped ? "Question" : "Click to reveal answer"}
        </span>
      </button>

      {flipped && (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map((r) => (
            <button
              key={r.id}
              onClick={() => rate(r.id)}
              className={cn("rounded-md px-2 py-2 text-xs font-medium transition-opacity hover:opacity-80", r.className)}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
