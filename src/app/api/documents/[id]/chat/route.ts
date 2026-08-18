import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { requireProcessedDocument, toErrorResponse } from "@/lib/api/guard";
import { answerDocumentQuestion } from "@/lib/ai/chat";

/** Returns (creating if needed) the single conversation for this document — one thread per document keeps the MVP simple. */
async function getOrCreateConversation(documentId: string) {
  const [existing] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.documentId, documentId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db.insert(conversations).values({ documentId }).returning();
  return created;
}

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/documents/[id]/chat">,
) {
  const { id } = await ctx.params;
  const guard = await requireProcessedDocument(id);
  if ("error" in guard) return guard.error;

  const conversation = await getOrCreateConversation(id);
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversation.id))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json({ conversationId: conversation.id, messages: history });
}

const bodySchema = z.object({ message: z.string().min(1).max(2000) });

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/documents/[id]/chat">,
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

  const conversation = await getOrCreateConversation(id);

  await db.insert(messages).values({
    conversationId: conversation.id,
    role: "user",
    content: parsed.data.message,
  });

  try {
    const result = await answerDocumentQuestion(id, parsed.data.message);

    const [assistantMessage] = await db
      .insert(messages)
      .values({
        conversationId: conversation.id,
        role: "assistant",
        content: result.answer,
        sources: result.sources,
      })
      .returning();

    return NextResponse.json({ message: assistantMessage, grounded: result.grounded });
  } catch (err) {
    return toErrorResponse(err, 502);
  }
}
