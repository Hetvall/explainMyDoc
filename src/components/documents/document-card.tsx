"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, MoreVertical, Trash2, ArrowRight } from "lucide-react";
import { StatusBadge } from "./status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import type { Document } from "@/lib/db/schema";

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DocumentCard({ document }: { document: Document }) {
  const router = useRouter();
  const { toast } = useToast();

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const res = await fetch(`/api/documents/${document.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Document deleted", variant: "success" });
      router.refresh();
    } else {
      toast({ title: "Couldn't delete this document", variant: "error" });
    }
  }

  return (
    <Link
      href={`/documents/${document.id}`}
      className="group flex flex-col rounded-md border border-border bg-surface p-4 transition-all hover:border-border-strong hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
          <FileText className="size-4" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.preventDefault()}
              className="rounded-md p-1 text-foreground-subtle opacity-0 transition-opacity hover:bg-surface-muted hover:text-foreground group-hover:opacity-100"
              aria-label="Document actions"
            >
              <MoreVertical className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem destructive onClick={handleDelete}>
              <Trash2 className="size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="mt-3 line-clamp-2 font-medium leading-snug">{document.title}</p>

      <div className="mt-2 flex items-center gap-2 text-xs text-foreground-subtle">
        <span className="font-mono uppercase">
          {document.mimeType === "application/pdf" ? "PDF" : "TXT"}
        </span>
        <span>·</span>
        <span>{formatDate(document.createdAt)}</span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <StatusBadge status={document.status} />
        <ArrowRight className="size-4 text-foreground-subtle opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  );
}
