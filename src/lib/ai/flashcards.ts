import { getDocumentContext } from "./context";
import { safeGenerateObject } from "./generate-object";
import { flashcardsSchema, type GeneratedFlashcards } from "./schemas";

const SYSTEM_PROMPT = `You create study flashcards strictly based on a given document.

Rules:
- Each card's front is a concise question or concept prompt; the back is a concise, correct answer/explanation grounded in the document.
- Cover the document's distinct key concepts — don't create near-duplicate cards.
- Keep answers tight (1-3 sentences) — flashcards are for quick recall, not essays.`;

export async function generateFlashcards(
  documentId: string,
  count: number,
): Promise<GeneratedFlashcards> {
  const { title, text, truncated } = await getDocumentContext(documentId);

  const result = await safeGenerateObject({
    schema: flashcardsSchema,
    system: SYSTEM_PROMPT,
    prompt: `Document title: ${title}
${truncated ? "(Note: truncated for length.)\n" : ""}
Document content:
"""
${text}
"""

Create exactly ${count} flashcards covering the document's most important, distinct concepts.`,
  });

  return result;
}
