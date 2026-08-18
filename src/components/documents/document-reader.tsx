"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { ExplainMenu } from "@/components/documents/explain-menu";

interface Props {
  documentId: string;
  pages: { pageNumber: number; text: string }[];
}

/**
 * Renders extracted document text and turns a text selection into an
 * "Explain this" trigger (the ExplainMenu handles mode choice + the AI
 * call). Selection state is tracked via the Selection API on mouseup.
 */
export function DocumentReader({ documentId, pages }: Props) {
  const [selection, setSelection] = React.useState<{ text: string; rect: DOMRect } | null>(
    null,
  );
  const containerRef = React.useRef<HTMLDivElement>(null);

  function handleMouseUp() {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || text.length < 3 || !containerRef.current) {
      return;
    }
    if (!containerRef.current.contains(sel!.anchorNode)) return;

    const range = sel!.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelection({ text, rect });
  }

  return (
    <div ref={containerRef} onMouseUp={handleMouseUp} className="relative">
      <article className="prose-doc font-serif text-[15px] leading-[1.85]">
        {pages.map((page) => (
          <section key={page.pageNumber} id={`page-${page.pageNumber}`} className="mb-8 scroll-mt-20">
            <p className="mb-3 select-none font-mono text-xs text-foreground-subtle">
              Page {page.pageNumber}
            </p>
            {page.text.split(/\n{2,}/).map((para, i) => (
              <p key={i} className="mb-4 whitespace-pre-wrap text-foreground">
                {para}
              </p>
            ))}
          </section>
        ))}
      </article>

      {selection && (
        <Popover
          open
          onOpenChange={(open) => {
            if (!open) setSelection(null);
          }}
        >
          <PopoverAnchor asChild>
            <div
              style={{
                position: "fixed",
                left: selection.rect.left + selection.rect.width / 2,
                top: selection.rect.top,
                width: 1,
                height: 1,
              }}
            />
          </PopoverAnchor>
          <PopoverContent side="top" align="center" className="w-auto p-1">
            <ExplainMenu
              documentId={documentId}
              selectedText={selection.text}
              onDone={() => setSelection(null)}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export function ExplainTrigger() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-brand">
      <Sparkles className="size-3" /> Explain this
    </span>
  );
}
