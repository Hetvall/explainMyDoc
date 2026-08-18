import { notFound } from "next/navigation";
import { FileText, Hash, Clock, Calendar } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth";
import { getOwnedDocument } from "@/lib/db/queries";
import { ProcessingStatus } from "@/components/documents/processing-status";
import { DocumentReader } from "@/components/documents/document-reader";
import { AiPanel } from "@/components/documents/ai-panel";
import { StatusBadge } from "@/components/documents/status-badge";
import { estimateReadingMinutes } from "@/lib/documents/clean";

export const dynamic = "force-dynamic";

export default async function DocumentPage({
  params,
}: PageProps<"/documents/[id]">) {
  const { id } = await params;
  const userId = getCurrentUserId();
  const document = await getOwnedDocument(id, userId);

  if (!document) notFound();

  if (document.status !== "processed") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <ProcessingStatus document={document} />
      </div>
    );
  }

  const pages = document.extractedText ?? [];
  const readingMinutes = document.wordCount
    ? estimateReadingMinutes(document.wordCount)
    : null;

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_1fr_400px]">
      {/* LEFT: document info */}
      <aside className="order-1 lg:order-none">
        <div className="lg:sticky lg:top-20 space-y-4">
          <div className="rounded-md border border-border bg-surface p-4">
            <div className="flex size-9 items-center justify-center rounded-md bg-brand-soft text-brand">
              <FileText className="size-4" />
            </div>
            <h1 className="mt-3 font-serif text-lg font-semibold leading-snug">
              {document.title}
            </h1>
            <div className="mt-3">
              <StatusBadge status={document.status} />
            </div>
            <dl className="mt-4 space-y-2 text-xs text-foreground-muted">
              <div className="flex items-center gap-1.5">
                <Hash className="size-3.5" />
                {document.pageCount ?? "—"} pages · {document.wordCount ?? "—"} words
              </div>
              {readingMinutes && (
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  ~{readingMinutes} min read
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {new Date(document.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </dl>
          </div>

          {pages.length > 0 && (
            <div className="hidden rounded-md border border-border bg-surface p-4 lg:block">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-subtle">
                Pages
              </p>
              <nav className="scrollbar-thin max-h-64 space-y-0.5 overflow-y-auto text-sm">
                {pages.map((p) => (
                  <a
                    key={p.pageNumber}
                    href={`#page-${p.pageNumber}`}
                    className="block rounded-sm px-2 py-1 text-foreground-muted hover:bg-surface-muted hover:text-foreground"
                  >
                    Page {p.pageNumber}
                  </a>
                ))}
              </nav>
            </div>
          )}
        </div>
      </aside>

      {/* CENTER: extracted text */}
      <section className="order-3 min-w-0 rounded-md border border-border bg-surface p-6 lg:order-none">
        <DocumentReader documentId={document.id} pages={pages} />
      </section>

      {/* RIGHT: AI tools */}
      <aside className="order-2 lg:order-none">
        <div className="rounded-md border border-border bg-surface p-4 lg:sticky lg:top-20 lg:flex lg:max-h-[calc(100vh-5.5rem)] lg:flex-col">
          <AiPanel documentId={document.id} />
        </div>
      </aside>
    </div>
  );
}
