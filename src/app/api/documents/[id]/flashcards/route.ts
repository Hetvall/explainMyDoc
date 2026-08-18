import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { flashcards } from "@/lib/db/schema";
import { requireProcessedDocument, toErrorResponse } from "@/lib/api/guard";
import { generateFlashcards } from "@/lib/ai/flashcards";

// AI generation can take a while — extend past the platform default on serverless.
export const maxDuration = 60;

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/documents/[id]/flashcards">,
) {
  const { id } = await ctx.params;
  const guard = await requireProcessedDocument(id);
  if ("error" in guard) return guard.error;

  const cards = await db
    .select()
    .from(flashcards)
    .where(eq(flashcards.documentId, id))
    .orderBy(asc(flashcards.createdAt));

  return NextResponse.json({ flashcards: cards });
}

const bodySchema = z.object({ count: z.number().int().min(5).max(30).default(12) });

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/documents/[id]/flashcards">,
) {
  const { id } = await ctx.params;
  const guard = await requireProcessedDocument(id);
  if ("error" in guard) return guard.error;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // no body is fine, defaults apply
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }

  try {
    const generated = await generateFlashcards(id, parsed.data.count);

    const cards = await db
      .insert(flashcards)
      .values(
        generated.cards.map((c) => ({
          documentId: id,
          question: c.question,
          answer: c.answer,
        })),
      )
      .returning();

    return NextResponse.json({ flashcards: cards }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err, 502);
  }
}
