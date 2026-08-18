import { generateText } from "ai";
import { getModel, AiServiceError } from "./provider";
import { retrieveRelevantChunks, formatContext } from "./retrieval";

const MODE_INSTRUCTIONS: Record<string, string> = {
  simple: "Explain this clearly and simply, in 2-4 sentences. Avoid jargon.",
  detailed:
    "Give a thorough, well-organized explanation covering the nuance of this concept, in a few short paragraphs.",
  eli10: "Explain this like the reader is 10 years old — simple words, no jargon, maybe a relatable comparison.",
  example: "Give one concrete, realistic example that illustrates this concept in practice.",
  analogy: "Explain this concept using a clear analogy to something from everyday life.",
};

export type ExplainMode = keyof typeof MODE_INSTRUCTIONS;

const SYSTEM_PROMPT = `You are ExplainMyDoc's "Explain this" tool. The user selected a piece of text
from their document and wants it explained. Use the surrounding document context (given below) to
ground your explanation in what the document actually means by this passage — don't explain a
generic/different definition of the term if the document uses it in a specific way. Stay focused
only on the selected text; don't summarize the whole document.`;

export async function explainText(
  documentId: string,
  selectedText: string,
  mode: ExplainMode,
): Promise<{ explanation: string; grounded: boolean }> {
  const instruction = MODE_INSTRUCTIONS[mode] ?? MODE_INSTRUCTIONS.simple;

  let contextBlock = "";
  let grounded = false;
  try {
    const chunks = await retrieveRelevantChunks(documentId, selectedText, 3);
    if (chunks.length > 0) {
      contextBlock = formatContext(chunks).context;
      grounded = true;
    }
  } catch {
    // Retrieval failure shouldn't block explaining the selected text itself.
  }

  try {
    const { text } = await generateText({
      model: getModel(),
      system: SYSTEM_PROMPT,
      prompt: `Selected text: "${selectedText}"

${contextBlock ? `Surrounding document context:\n${contextBlock}\n\n` : ""}Instruction: ${instruction}`,
    });

    return { explanation: text, grounded };
  } catch (err) {
    throw new AiServiceError(`Failed to generate an explanation: ${(err as Error).message}`);
  }
}
