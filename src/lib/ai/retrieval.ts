import { embed } from "ai";
import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { documentChunks } from "@/lib/db/schema";
import { getEmbeddingModel, getEmbeddingProviderOptions, AiServiceError } from "./provider";

export interface RetrievedChunk {
  id: string;
  content: string;
  pageNumber: number | null;
  chunkIndex: number;
  similarity: number;
}

/** Minimum cosine similarity for a chunk to be considered relevant enough to ground an answer. */
export const RELEVANCE_THRESHOLD = 0.3;

/**
 * The core RAG retrieval step: embeds the query and finds the top-K most
 * semantically similar chunks for one document via pgvector cosine
 * similarity (using the HNSW index defined in lib/db/schema.ts).
 */
export async function retrieveRelevantChunks(
  documentId: string,
  query: string,
  topK = 6,
): Promise<RetrievedChunk[]> {
  let queryEmbedding: number[];
  try {
    const { embedding } = await embed({
      model: getEmbeddingModel(),
      value: query,
      providerOptions: getEmbeddingProviderOptions(),
    });
    queryEmbedding = embedding;
  } catch (err) {
    throw new AiServiceError(`Failed to embed query: ${(err as Error).message}`);
  }

  const similarity = sql<number>`1 - (${cosineDistance(documentChunks.embedding, queryEmbedding)})`;

  const rows = await db
    .select({
      id: documentChunks.id,
      content: documentChunks.content,
      pageNumber: documentChunks.pageNumber,
      chunkIndex: documentChunks.chunkIndex,
      similarity,
    })
    .from(documentChunks)
    .where(and(eq(documentChunks.documentId, documentId), gt(similarity, RELEVANCE_THRESHOLD)))
    .orderBy((t) => desc(t.similarity))
    .limit(topK);

  return rows;
}

/** Formats retrieved chunks into a numbered context block + a parallel source list for citations. */
export function formatContext(chunks: RetrievedChunk[]) {
  const context = chunks
    .map((c, i) => `[${i + 1}] (page ${c.pageNumber ?? "?"}) ${c.content}`)
    .join("\n\n");
  const sources = chunks.map((c, i) => ({
    ref: i + 1,
    pageNumber: c.pageNumber,
    chunkIndex: c.chunkIndex,
    snippet: c.content.slice(0, 160),
  }));
  return { context, sources };
}
