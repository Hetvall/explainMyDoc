import { z } from "zod";

/** MIME types accepted for upload today. DOCX is a documented future addition (see lib/documents/extract.ts). */
export const ACCEPTED_MIME_TYPES = ["application/pdf", "text/plain"] as const;

export const ACCEPTED_EXTENSIONS = [".pdf", ".txt"] as const;

export function isAcceptedFile(mimeType: string, filename: string): boolean {
  if ((ACCEPTED_MIME_TYPES as readonly string[]).includes(mimeType)) return true;
  // Some browsers send an empty/octet-stream mimeType for .txt; fall back to extension.
  return ACCEPTED_EXTENSIONS.some((ext) => filename.toLowerCase().endsWith(ext));
}

export const quizDifficultySchema = z.enum(["easy", "medium", "hard"]);
export const quizQuestionCountSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(15),
]);

export const explainModeSchema = z.enum([
  "simple",
  "detailed",
  "eli10",
  "example",
  "analogy",
]);

export const generateQuizInputSchema = z.object({
  documentId: z.string().uuid(),
  difficulty: quizDifficultySchema,
  questionCount: quizQuestionCountSchema,
});

export const generateFlashcardsInputSchema = z.object({
  documentId: z.string().uuid(),
  count: z.number().int().min(5).max(30).default(12),
});

export const explainTextInputSchema = z.object({
  documentId: z.string().uuid(),
  selectedText: z.string().min(1).max(4000),
  mode: explainModeSchema,
});

export const chatMessageInputSchema = z.object({
  documentId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
});

export const studyPlanInputSchema = z.object({
  documentId: z.string().uuid(),
  goal: z.string().min(1).max(300),
  availableDays: z.number().int().min(1).max(60),
  hoursPerDay: z.number().min(0.5).max(12),
  difficulty: quizDifficultySchema,
});

export const flashcardRatingSchema = z.enum(["again", "hard", "good", "easy"]);

export const submitQuizAttemptSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedAnswer: z.string(),
    }),
  ),
});
