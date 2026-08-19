import { getDocumentContext } from "./context";
import { safeGenerateObject } from "./generate-object";
import { quizSchema, type GeneratedQuiz } from "./schemas";

const SYSTEM_PROMPT = `You write multiple-choice quiz questions strictly based on a given document.

Rules:
- Every question, correct answer, and explanation must be answerable from the document text alone.
- Each question has exactly 4 options, and correctAnswer must exactly match one of them (character for character).
- Distractors (wrong options) should be plausible, not silly, but clearly wrong to someone who read the document.
- Vary what each question tests: facts, definitions, cause/effect, the author's recommendations, etc.
- Do not create questions about information that isn't in the document.
- Write all questions, options, and explanations in the same language as the document content (detect it from the text — do not default to English if the document is in another language).`;

const DIFFICULTY_GUIDANCE: Record<string, string> = {
  easy: "Test recall of clearly-stated facts and definitions.",
  medium: "Test understanding of relationships between ideas, not just recall.",
  hard: "Test nuanced understanding, edge cases, and application of the document's ideas.",
};

export async function generateQuiz(
  documentId: string,
  difficulty: "easy" | "medium" | "hard",
  questionCount: number,
): Promise<GeneratedQuiz> {
  const { title, text, truncated } = await getDocumentContext(documentId);

  const result = await safeGenerateObject({
    schema: quizSchema,
    system: SYSTEM_PROMPT,
    prompt: `Document title: ${title}
${truncated ? "(Note: truncated for length.)\n" : ""}
Document content:
"""
${text}
"""

Write exactly ${questionCount} ${difficulty} multiple-choice questions. Difficulty guidance: ${DIFFICULTY_GUIDANCE[difficulty]}`,
  });

  return result;
}
