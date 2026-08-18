import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { AiServiceError } from "./provider";

/** Hard cap so a very long document can't blow the model's context window (or the bill). */
const MAX_CONTEXT_CHARS = 45_000;

/**
 * Fetches a document's title and cleaned full text for whole-document AI
 * tasks (summary, quiz, flashcards, study plan) that don't need
 * retrieval — those read the extracted text directly rather than chunks.
 */
export async function getDocumentContext(documentId: string) {
  const [doc] = await db
    .select({
      title: documents.title,
      status: documents.status,
      extractedText: documents.extractedText,
    })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc || doc.status !== "processed" || !doc.extractedText) {
    throw new AiServiceError("This document hasn't finished processing yet.");
  }

  let text = doc.extractedText.map((p) => p.text).join("\n\n");
  let truncated = false;
  if (text.length > MAX_CONTEXT_CHARS) {
    text = text.slice(0, MAX_CONTEXT_CHARS);
    truncated = true;
  }

  return { title: doc.title, text, truncated };
}
