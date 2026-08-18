import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getOwnedDocument } from "@/lib/db/queries";
import type { Document } from "@/lib/db/schema";

/**
 * Shared guard for document-scoped API routes: resolves the current
 * (demo) user, loads the document, and enforces ownership + processed
 * status. Returns a ready-to-return NextResponse on failure so route
 * handlers can `if ("error" in result) return result.error;`.
 */
export async function requireProcessedDocument(
  documentId: string,
): Promise<{ document: Document } | { error: NextResponse }> {
  const userId = getCurrentUserId();
  const doc = await getOwnedDocument(documentId, userId);

  if (!doc) {
    return { error: NextResponse.json({ error: "Document not found." }, { status: 404 }) };
  }
  if (doc.status !== "processed") {
    return {
      error: NextResponse.json(
        { error: "This document hasn't finished processing yet." },
        { status: 409 },
      ),
    };
  }
  return { document: doc };
}

/** Turns a thrown error into a JSON response with a sensible status code, without leaking internals. */
export function toErrorResponse(err: unknown, fallbackStatus = 500) {
  const message = err instanceof Error ? err.message : "Something went wrong.";
  return NextResponse.json({ error: message }, { status: fallbackStatus });
}
