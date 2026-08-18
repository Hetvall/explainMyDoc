import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { studyPlans } from "@/lib/db/schema";
import { requireProcessedDocument, toErrorResponse } from "@/lib/api/guard";
import { generateStudyPlan } from "@/lib/ai/study-plan";
import { quizDifficultySchema } from "@/lib/validation/document";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/documents/[id]/study-plan">,
) {
  const { id } = await ctx.params;
  const guard = await requireProcessedDocument(id);
  if ("error" in guard) return guard.error;

  const [latest] = await db
    .select()
    .from(studyPlans)
    .where(eq(studyPlans.documentId, id))
    .orderBy(desc(studyPlans.createdAt))
    .limit(1);

  return NextResponse.json({ studyPlan: latest ?? null });
}

const bodySchema = z.object({
  goal: z.string().min(1).max(300),
  availableDays: z.number().int().min(1).max(60),
  hoursPerDay: z.number().min(0.5).max(12),
  difficulty: quizDifficultySchema,
});

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/documents/[id]/study-plan">,
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
    const { goal, availableDays, hoursPerDay, difficulty } = parsed.data;
    const generated = await generateStudyPlan(id, goal, availableDays, hoursPerDay, difficulty);

    const [saved] = await db
      .insert(studyPlans)
      .values({
        documentId: id,
        goal,
        availableDays,
        hoursPerDay,
        difficulty,
        plan: generated,
      })
      .returning();

    return NextResponse.json({ studyPlan: saved }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err, 502);
  }
}
