import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { flashcards } from "@/lib/db/schema";
import { requireProcessedDocument, toErrorResponse } from "@/lib/api/guard";
import { flashcardRatingSchema } from "@/lib/validation/document";
import { isValidUuid } from "@/lib/db/queries";

const bodySchema = z.object({ rating: flashcardRatingSchema });

/** Records a review rating (Again/Hard/Good/Easy). No spaced-repetition scheduling yet — see schema comment on `flashcards.difficulty` for the intended extension point. */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/documents/[id]/flashcards/[cardId]">,
) {
  const { id, cardId } = await ctx.params;
  const guard = await requireProcessedDocument(id);
  if ("error" in guard) return guard.error;

  if (!isValidUuid(cardId)) {
    return NextResponse.json({ error: "Flashcard not found." }, { status: 404 });
  }

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
    const [updated] = await db
      .update(flashcards)
      .set({
        difficulty: parsed.data.rating,
        lastReviewedAt: new Date(),
        reviewCount: sql`${flashcards.reviewCount} + 1`,
      })
      .where(and(eq(flashcards.id, cardId), eq(flashcards.documentId, id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Flashcard not found." }, { status: 404 });
    }
    return NextResponse.json({ flashcard: updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}
