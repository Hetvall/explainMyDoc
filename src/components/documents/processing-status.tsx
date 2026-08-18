"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Document } from "@/lib/db/schema";

const PROCESSING_MESSAGES = [
  "Reading your document…",
  "Cleaning up the extracted text…",
  "Splitting it into sections…",
  "Understanding the content…",
  "Almost there…",
];

/**
 * Polls a document's status while it's uploaded/processing and refreshes
 * the server component once it reaches a terminal state, so the UI never
 * sits on "Processing…" indefinitely.
 */
export function ProcessingStatus({ document }: { document: Document }) {
  const router = useRouter();
  const [messageIndex, setMessageIndex] = React.useState(0);

  React.useEffect(() => {
    if (document.status !== "processing" && document.status !== "uploaded") return;

    const poll = setInterval(async () => {
      const res = await fetch(`/api/documents/${document.id}`);
      if (!res.ok) return;
      const { document: latest } = await res.json();
      if (latest.status !== "uploaded" && latest.status !== "processing") {
        router.refresh();
      }
    }, 2000);

    const rotate = setInterval(() => {
      setMessageIndex((i) => (i + 1) % PROCESSING_MESSAGES.length);
    }, 2500);

    return () => {
      clearInterval(poll);
      clearInterval(rotate);
    };
  }, [document.id, document.status, router]);

  if (document.status === "failed") {
    return (
      <div className="mx-auto max-w-lg animate-in-fade rounded-md border border-danger-soft bg-danger-soft/40 p-8 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-danger-soft text-danger">
          <AlertTriangle className="size-5" />
        </div>
        <h2 className="mt-4 font-medium">Couldn&apos;t process this document</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          {document.errorMessage ?? "Something went wrong. Please try uploading again."}
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-5"
          onClick={async () => {
            await fetch(`/api/documents/${document.id}`, { method: "DELETE" });
            router.push("/dashboard");
          }}
        >
          <Trash2 className="size-3.5" />
          Remove and try another file
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg animate-in-fade rounded-md border border-border bg-surface p-8 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Loader2 className="size-5 animate-spin" />
      </div>
      <h2 className="mt-4 font-medium">{PROCESSING_MESSAGES[messageIndex]}</h2>
      <p className="mt-1 text-sm text-foreground-muted">
        This usually takes under a minute, depending on document length.
      </p>
    </div>
  );
}
