import { z } from "zod";

/**
 * Zod schemas for every structured AI output. Passed to `generateObject`
 * so malformed model output is caught and retried instead of trusted
 * blindly (see lib/ai/generate-object.ts).
 */

export const summarySchema = z.object({
  tldr: z.string().describe("A 2-3 sentence plain-language summary of the document."),
  keyPoints: z
    .array(z.string())
    .min(3)
    .max(8)
    .describe("The most important ideas, as short standalone statements."),
  concepts: z
    .array(z.object({ term: z.string(), definition: z.string() }))
    .max(8)
    .describe("Important terminology or concepts explicitly defined or used in the document."),
  actionItems: z
    .array(z.string())
    .describe(
      "Tasks, recommendations, requirements, or decisions found in the document. Empty array if none exist.",
    ),
  whoShouldCare: z.string().describe("Who would benefit from reading this document, and why."),
  readingTimeMinutes: z.number().int().positive(),
});
export type Summary = z.infer<typeof summarySchema>;

export const quizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctAnswer: z.string().describe("Must exactly match one of the options."),
  explanation: z.string().describe("Why the correct answer is right, grounded in the document."),
});

export const quizSchema = z.object({
  questions: z.array(quizQuestionSchema),
});
export type GeneratedQuiz = z.infer<typeof quizSchema>;

export const flashcardSchema = z.object({
  question: z.string().describe("The front of the card: a concept or question."),
  answer: z.string().describe("The back of the card: a concise answer or explanation."),
});

export const flashcardsSchema = z.object({
  cards: z.array(flashcardSchema),
});
export type GeneratedFlashcards = z.infer<typeof flashcardsSchema>;

export const studyDaySchema = z.object({
  day: z.number().int().positive(),
  title: z.string(),
  tasks: z.array(z.string()),
});

export const studyPlanSchema = z.object({
  days: z.array(studyDaySchema),
  summary: z.string().describe("One sentence framing the overall plan."),
});
export type GeneratedStudyPlan = z.infer<typeof studyPlanSchema>;
