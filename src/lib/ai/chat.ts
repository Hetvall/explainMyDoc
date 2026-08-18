import { generateText } from "ai";
import { getModel, AiServiceError } from "./provider";
import { retrieveRelevantChunks, formatContext, type RetrievedChunk } from "./retrieval";

const SYSTEM_PROMPT = `You are ExplainMyDoc's document assistant. You answer questions using ONLY the
numbered context excerpts provided below, which come from the user's uploaded document.

Rules:
- Answer using only the given context. Do not use outside knowledge to fill gaps.
- If the context doesn't contain the answer, say plainly: "I couldn't find that information in this document." Do not guess.
- When you use a fact from an excerpt, you may reference it like "(page X)" using the page number given.
- Be direct and concise. This is a study/work tool, not a chat companion.`;

export interface ChatAnswer {
  answer: string;
  sources: { ref: number; pageNumber: number | null; chunkIndex: number; snippet: string }[];
  grounded: boolean;
}

export async function answerDocumentQuestion(
  documentId: string,
  question: string,
): Promise<ChatAnswer> {
  let chunks: RetrievedChunk[];
  try {
    chunks = await retrieveRelevantChunks(documentId, question, 6);
  } catch (err) {
    if (err instanceof AiServiceError) throw err;
    throw new AiServiceError(`Search failed: ${(err as Error).message}`);
  }

  if (chunks.length === 0) {
    return {
      answer: "I couldn't find that information in this document.",
      sources: [],
      grounded: false,
    };
  }

  const { context, sources } = formatContext(chunks);

  try {
    const { text } = await generateText({
      model: getModel(),
      system: SYSTEM_PROMPT,
      prompt: `Context excerpts from the document:\n\n${context}\n\nQuestion: ${question}`,
    });

    return { answer: text, sources, grounded: true };
  } catch (err) {
    throw new AiServiceError(`Failed to generate an answer: ${(err as Error).message}`);
  }
}
