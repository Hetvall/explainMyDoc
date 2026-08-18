import { embedMany } from "ai";
import { getEmbeddingModel, getEmbeddingProviderOptions, AiServiceError } from "@/lib/ai/provider";
import type { DocumentChunkInput } from "./chunk";

export interface EmbeddedChunk extends DocumentChunkInput {
  embedding: number[];
}

// Kept modest (rather than the ~100+ some providers allow per request) so a
// batch stays cheap to retry and stays comfortably under free-tier rate
// limits (Google's free tier in particular).
const BATCH_SIZE = 20;

/**
 * Generates embeddings for chunks in batches — batching keeps individual
 * requests small enough to retry cheaply on transient failure.
 */
export async function embedChunks(
  chunks: DocumentChunkInput[],
): Promise<EmbeddedChunk[]> {
  if (chunks.length === 0) return [];

  const model = getEmbeddingModel();
  const providerOptions = getEmbeddingProviderOptions();
  const results: EmbeddedChunk[] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    try {
      const { embeddings } = await embedMany({
        model,
        values: batch.map((c) => c.content),
        providerOptions,
      });
      batch.forEach((chunk, idx) => {
        results.push({ ...chunk, embedding: embeddings[idx] });
      });
    } catch (err) {
      throw new AiServiceError(
        `Failed to generate embeddings: ${(err as Error).message}`,
      );
    }
  }

  return results;
}
