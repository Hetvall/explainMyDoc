import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { quizzes, quizQuestions } from "@/lib/db/schema";
import { requireProcessedDocument, toErrorResponse } from "@/lib/api/guard";
import { generateQuiz } from "@/lib/ai/quiz";
import { quizDifficultySchema, quizQuestionCountSchema } from "@/lib/validation/document";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/documents/[id]/quiz">,
) {
  const { id } = await ctx.params;
  const guard = await requireProcessedDocument(id);
  if ("error" in guard) return guard.error;

  const [latest] = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.documentId, id))
    .orderBy(desc(quizzes.createdAt))
    .limit(1);

  if (!latest) return NextResponse.json({ quiz: null });

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, latest.id))
    .orderBy(quizQuestions.questionIndex);

  return NextResponse.json({ quiz: { ...latest, questions } });
}

const bodySchema = z.object({
  difficulty: quizDifficultySchema,
  questionCount: quizQuestionCountSchema,
});

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/documents/[id]/quiz">,
) {
  const { id } = await ctx.params;
  const guard = await requireProcessedDocument(id);
  if ("error" in guard) return guard.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }

  try {
    const generated = await generateQuiz(id, parsed.data.difficulty, parsed.data.questionCount);

    const [quiz] = await db
      .insert(quizzes)
      .values({
        documentId: id,
        difficulty: parsed.data.difficulty,
        questionCount: generated.questions.length,
      })
      .returning();

    const questions = await db
      .insert(quizQuestions)
      .values(
        generated.questions.map((q, index) => ({
          quizId: quiz.id,
          questionIndex: index,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
        })),
      )
      .returning();

    return NextResponse.json({ quiz: { ...quiz, questions } }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err, 502);
  }
}
