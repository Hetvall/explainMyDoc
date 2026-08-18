"use client";

import * as React from "react";
import { Loader2, Send, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { ref: number; pageNumber: number | null }[] | null;
}

const SUGGESTIONS = [
  "What is this document about?",
  "What are the most important points?",
  "What does the author recommend?",
];

export function ChatPanel({ documentId }: { documentId: string }) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [loadingHistory, setLoadingHistory] = React.useState(true);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    (async () => {
      const res = await fetch(`/api/documents/${documentId}/chat`);
      const data = await res.json();
      setMessages(data.messages ?? []);
      setLoadingHistory(false);
    })();
  }, [documentId]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string) {
    if (!text.trim() || sending) return;
    setInput("");
    setSending(true);

    const optimisticUser: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const res = await fetch(`/api/documents/${documentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to get an answer.");
      setMessages((prev) => [...prev, data.message]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Sorry, something went wrong: ${(err as Error).message}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[520px] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {loadingHistory && (
          <div className="flex justify-center py-8 text-foreground-subtle">
            <Loader2 className="size-4 animate-spin" />
          </div>
        )}

        {!loadingHistory && messages.length === 0 && (
          <div className="py-6 text-center">
            <MessageSquareText className="mx-auto size-6 text-foreground-subtle" />
            <p className="mt-2 text-sm text-foreground-muted">
              Ask anything about this document. Answers are grounded in its content.
            </p>
            <div className="mt-4 flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-md border border-border px-3 py-1.5 text-left text-xs text-foreground-muted hover:bg-surface-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-md px-3 py-2 text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-brand text-brand-foreground"
                  : "border border-border bg-surface-muted text-foreground",
              )}
            >
              {m.content}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1 border-t border-border/60 pt-1.5 font-mono text-[11px] text-foreground-subtle">
                  {m.sources.map((s) =>
                    s.pageNumber ? <span key={s.ref}>p.{s.pageNumber}</span> : null,
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-foreground-muted">
              <Loader2 className="size-3.5 animate-spin" />
              Searching your document…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex items-end gap-2 border-t border-border pt-3"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask a question about this document…"
          rows={1}
          className="min-h-9 resize-none"
        />
        <Button type="submit" size="icon" disabled={sending || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
