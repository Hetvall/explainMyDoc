import { db } from "@/lib/db";
import { documentChunks } from "@/lib/db/schema";
import { updateDocumentStatus } from "@/lib/db/queries";
import { getStorage } from "@/lib/storage";
import { hasAiCredentials } from "@/lib/env";
import { extractDocumentText, DocumentExtractionError } from "./extract";
import { cleanText, countWords } from "./clean";
import { chunkDocument } from "./chunk";
import { embedChunks } from "./embed";
import { AiServiceError } from "@/lib/ai/provider";

/**
 * Runs the full document pipeline (extract -> clean -> chunk -> embed ->
 * persist) and always leaves the document in a terminal status
 * (`processed` or `failed` with a message) — never stuck on `processing`.
 */
export async function processDocument(documentId: string, storageKey: string) {
  try {
    await updateDocumentStatus(documentId, "processing");

    const storage = getStorage();
    const buffer = await storage.read(storageKey);

    const mimeTypeGuess = storageKey.toLowerCase().endsWith(".txt")
      ? "text/plain"
      : "application/pdf";

    // Diagnostic only — helps distinguish "the file itself is invalid" from
    // "the bytes got corrupted/truncated in transit or in storage" when
    // reading production logs for a failed document.
    console.info(
      `[processDocument] documentId=${documentId} storageKey=${storageKey} bytes=${buffer.length} head=${buffer.subarray(0, 8).toString("hex")}`,
    );

    const { pages, fullText } = await extractDocumentText(buffer, mimeTypeGuess);
    const cleanedFullText = cleanText(fullText);
    const wordCount = countWords(cleanedFullText);
    const cleanedPages = pages.map((p) => ({
      pageNumber: p.pageNumber,
      text: cleanText(p.text),
    }));

    const MIN_WORD_COUNT = 20;
    if (wordCount < MIN_WORD_COUNT) {
      throw new DocumentExtractionError(
        wordCount === 0
          ? "No readable text was found in this document. If it's a scanned PDF (a photo or image of a page rather than real text), it needs OCR before it can be processed."
          : `This document only has ${wordCount} word${wordCount === 1 ? "" : "s"} of readable text — at least ${MIN_WORD_COUNT} are needed to process it. It may be mostly images, or the text may not have extracted correctly.`,
      );
    }

    const chunks = chunkDocument(pages);
    if (chunks.length === 0) {
      throw new DocumentExtractionError(
        "Could not split this document into readable sections.",
      );
    }

    if (!hasAiCredentials()) {
      throw new AiServiceError(
        "AI features are not configured yet. Add an OPENAI_API_KEY to enable processing.",
      );
    }

    const embedded = await embedChunks(chunks);

    await db.insert(documentChunks).values(
      embedded.map((chunk) => ({
        documentId,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        pageNumber: chunk.pageNumber,
        embedding: chunk.embedding,
      })),
    );

    await updateDocumentStatus(documentId, "processed", {
      pageCount: pages.length,
      wordCount,
      extractedText: cleanedPages,
    });
  } catch (err) {
    const message =
      err instanceof DocumentExtractionError || err instanceof AiServiceError
        ? err.message
        : `Something went wrong while processing this document. (${(err as Error).message})`;
    // Kept out of the DB error message (which is user-facing) but logged
    // here so production failures are diagnosable from Vercel logs.
    console.error(`[processDocument] documentId=${documentId} failed:`, err);
    await updateDocumentStatus(documentId, "failed", { errorMessage: message });
  }
}
