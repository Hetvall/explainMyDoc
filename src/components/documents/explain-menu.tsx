"use client";

import * as React from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const MODES: { id: string; label: string }[] = [
  { id: "simple", label: "Simple" },
  { id: "detailed", label: "Detailed" },
  { id: "eli10", label: "Like I'm 10" },
  { id: "example", label: "Example" },
  { id: "analogy", label: "Analogy" },
];

export function ExplainMenu({
  documentId,
  selectedText,
  onDone,
}: {
  documentId: string;
  selectedText: string;
  onDone: () => void;
}) {
  const [activeMode, setActiveMode] = React.useState<string | null>(null);
  const [explanation, setExplanation] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleModeClick(mode: string) {
    setActiveMode(mode);
    setLoading(true);
    setError(null);
    setExplanation(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedText, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to explain this.");
      setExplanation(data.explanation);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // This component swaps between two entirely different subtrees (the mode
  // picker below vs. the detail view further down) and, within the detail
  // view, mounts/unmounts several more blocks (loading/error/explanation).
  // Each of those is a point where React removes DOM nodes it manages. If
  // browser auto-translation (Google Translate) has rewritten a text node
  // in place with a <font> wrapper, React can no longer find the node it
  // expects to remove and throws "Failed to execute 'removeChild' on
  // 'Node'" — the crash behind the "Algo salió mal" screen (see
  // components/ui/select.tsx for the full writeup). Every raw text child
  // below is wrapped in its own <span> so translation's mutation stays
  // scoped to a leaf neither React nor Radix needs to remove directly.
  if (!activeMode) {
    return (
      <div className="flex w-64 flex-col gap-1">
        <p className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-foreground-subtle">
          <Sparkles className="size-3" /> <span>Explain this</span>
        </p>
        {MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => handleModeClick(mode.id)}
            className="rounded-sm px-2 py-1.5 text-left text-sm hover:bg-surface-muted"
          >
            <span>{mode.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-80 max-w-[80vw]">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium text-foreground-subtle">
          <Sparkles className="size-3" />
          <span>{MODES.find((m) => m.id === activeMode)?.label}</span>
        </p>
        <button onClick={onDone} className="text-foreground-subtle hover:text-foreground">
          <X className="size-3.5" />
        </button>
      </div>

      <div className="mb-2 rounded-sm bg-surface-muted px-2 py-1.5 text-xs italic text-foreground-muted line-clamp-2">
        <span>&ldquo;{selectedText}&rdquo;</span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-4 text-sm text-foreground-muted">
          <Loader2 className="size-4 animate-spin" />
          <span>Thinking…</span>
        </div>
      )}

      {error && (
        <p className="py-2 text-sm text-danger">
          <span>{error}</span>
        </p>
      )}

      {explanation && (
        <p className="max-h-64 overflow-y-auto text-sm leading-relaxed text-foreground">
          <span>{explanation}</span>
        </p>
      )}

      {!loading && (
        <div className="mt-3 flex flex-wrap gap-1 border-t border-border pt-2">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => handleModeClick(mode.id)}
              className={cn(
                "rounded-full px-2 py-0.5 text-xs transition-colors",
                mode.id === activeMode
                  ? "bg-brand text-brand-foreground"
                  : "bg-surface-muted text-foreground-muted hover:bg-border/60",
              )}
            >
              <span>{mode.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
