import { getDocumentContext } from "./context";
import { safeGenerateObject } from "./generate-object";
import { summarySchema, type Summary } from "./schemas";
import { countWords, estimateReadingMinutes } from "@/lib/documents/clean";

const SYSTEM_PROMPT = `You are ExplainMyDoc's summarization engine. You turn dense documents into a
clear, structured summary. Ground every field strictly in the provided document text.

Rules:
- Never invent facts, numbers, or claims that aren't in the document.
- If the document doesn't contain action items, return an empty array for actionItems — do not fabricate any.
- Keep keyPoints as short, standalone, concrete statements (not vague generalities).
- "concepts" should only include terms that are actually meaningful/technical in this document.
- "whoShouldCare" should be a specific, practical answer, not generic filler.`;

export async function generateSummary(documentId: string): Promise<Summary> {
  const { title, text, truncated } = await getDocumentContext(documentId);
  const readingTimeMinutes = estimateReadingMinutes(countWords(text));

  const result = await safeGenerateObject({
    schema: summarySchema,
    system: SYSTEM_PROMPT,
    prompt: `Document title: ${title}
${truncated ? "(Note: this document was truncated for length — summarize what is shown.)\n" : ""}
Document content:
"""
${text}
"""

Produce a structured summary following the schema. For readingTimeMinutes, use ${readingTimeMinutes} (already computed from word count) unless you have strong reason to adjust it.`,
  });

  return { ...result, readingTimeMinutes: result.readingTimeMinutes || readingTimeMinutes };
}
