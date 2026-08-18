"use client";

import * as React from "react";
import { Loader2, AlertCircle, Clock, Users, ListChecks, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Summary } from "@/lib/ai/schemas";

export function SummaryPanel({ documentId }: { documentId: string }) {
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const generate = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/summary`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't generate a summary.");
      setSummary(data.summary);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/documents/${documentId}/summary`);
      const data = await res.json();
      if (cancelled) return;
      if (data.summary) {
        setSummary(data.summary);
        setLoading(false);
      } else {
        generate();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-foreground-muted">
        <Loader2 className="size-5 animate-spin text-brand" />
        Generating your summary…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertCircle className="size-5 text-danger" />
        <p className="text-sm text-foreground-muted">{error}</p>
        <Button size="sm" variant="secondary" onClick={generate}>
          Try again
        </Button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="animate-in-fade space-y-6 text-sm">
      <div>
        <SectionLabel icon={BookOpen}>TL;DR</SectionLabel>
        <p className="leading-relaxed text-foreground">{summary.tldr}</p>
      </div>

      <div>
        <SectionLabel icon={ListChecks}>Key points</SectionLabel>
        <ul className="space-y-1.5">
          {summary.keyPoints.map((point, i) => (
            <li key={i} className="flex gap-2 leading-relaxed text-foreground">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-brand" />
              {point}
            </li>
          ))}
        </ul>
      </div>

      {summary.concepts.length > 0 && (
        <div>
          <SectionLabel>Important concepts</SectionLabel>
          <dl className="space-y-2">
            {summary.concepts.map((c, i) => (
              <div key={i}>
                <dt className="font-medium text-foreground">{c.term}</dt>
                <dd className="text-foreground-muted">{c.definition}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div>
        <SectionLabel>Action items</SectionLabel>
        {summary.actionItems.length > 0 ? (
          <ul className="space-y-1.5">
            {summary.actionItems.map((item, i) => (
              <li key={i} className="flex gap-2 leading-relaxed text-foreground">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-warning" />
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-foreground-subtle">
            No explicit tasks or recommendations found in this document.
          </p>
        )}
      </div>

      <div>
        <SectionLabel icon={Users}>Who should care</SectionLabel>
        <p className="leading-relaxed text-foreground-muted">{summary.whoShouldCare}</p>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-foreground-subtle">
        <Clock className="size-3.5" />
        About {summary.readingTimeMinutes} min read in full
      </div>
    </div>
  );
}

function SectionLabel({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground-subtle">
      {Icon && <Icon className="size-3.5" />}
      {children}
    </p>
  );
}
