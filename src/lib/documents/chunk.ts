import { cleanText } from "./clean";
import type { ExtractedPage } from "./extract";

export interface DocumentChunkInput {
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
}

export interface ChunkOptions {
  /** Target characters per chunk. */
  size: number;
  /** Character overlap between consecutive chunks, to preserve context across boundaries. */
  overlap: number;
}

export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = { size: 1000, overlap: 150 };

/**
 * Splits cleaned per-page text into overlapping chunks for embedding,
 * preserving `pageNumber` on each chunk so RAG answers can cite a source.
 * Splits on paragraph/sentence boundaries where possible instead of
 * mid-word, to keep chunks semantically coherent.
 */
export function chunkDocument(
  pages: ExtractedPage[],
  options: ChunkOptions = DEFAULT_CHUNK_OPTIONS,
): DocumentChunkInput[] {
  const chunks: DocumentChunkInput[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const text = cleanText(page.text);
    if (!text) continue;

    const segments = splitIntoSegments(text, options.size);
    let buffer = "";

    for (const segment of segments) {
      if (buffer.length + segment.length > options.size && buffer.length > 0) {
        chunks.push({
          content: buffer.trim(),
          chunkIndex: chunkIndex++,
          pageNumber: page.pageNumber,
        });
        buffer = buffer.slice(Math.max(0, buffer.length - options.overlap));
      }
      buffer += (buffer ? " " : "") + segment;
    }

    if (buffer.trim()) {
      chunks.push({
        content: buffer.trim(),
        chunkIndex: chunkIndex++,
        pageNumber: page.pageNumber,
      });
    }
  }

  return chunks;
}

/** Splits text into sentence-ish segments so chunk boundaries fall on natural breaks. */
function splitIntoSegments(text: string, maxSegmentLength: number): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const segments: string[] = [];

  for (const sentence of sentences) {
    if (sentence.length <= maxSegmentLength) {
      segments.push(sentence);
    } else {
      // Extremely long "sentence" (e.g. no punctuation) — hard-split by length.
      for (let i = 0; i < sentence.length; i += maxSegmentLength) {
        segments.push(sentence.slice(i, i + maxSegmentLength));
      }
    }
  }

  return segments;
}
