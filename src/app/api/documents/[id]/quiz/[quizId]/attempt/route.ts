import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { quizAttempts, quizQuestions, quizzes } from "@/lib/db/schema";
import { requireProcessedDocument, toErrorResponse } from "@/lib/api/guard";
import { submitQuizAttemptSchema } from "@/lib/validation/document";
import { isValidUuid } from "@/lib/db/queries";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/documents/[id]/quiz/[quizId]/attempt">,
) {
  const { id, quizId } = await ctx.params;
  const guard = await requireProcessedDocument(id);
  if ("error" in guard) return guard.error;

  if (!isValidUuid(quizId)) {
    return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
  }

  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1);
  if (!quiz || quiz.documentId !== id) {
    return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = submitQuizAttemptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId));

  const questionById = new Map(questions.map((q) => [q.id, q]));
  let correctCount = 0;
  const weakAreas: string[] = [];
  const answers = parsed.data.answers.map((a) => {
    const question = questionById.get(a.questionId);
    const correct = !!question && question.correctAnswer === a.selectedAnswer;
    if (correct) correctCount++;
    else if (question) weakAreas.push(question.question);
    return { questionId: a.questionId, selectedAnswer: a.selectedAnswer, correct };
  });

  const percentage = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  try {
    await db.insert(quizAttempts).values({
      quizId,
      score: correctCount,
      percentage,
      answers,
      weakAreas,
    });

    await db.update(quizzes).set({ score: correctCount }).where(eq(quizzes.id, quizId));

    return NextResponse.json({
      score: correctCount,
      total: questions.length,
      percentage,
      weakAreas,
      answers,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
