import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProcessedDocument, toErrorResponse } from "@/lib/api/guard";
import { explainTextInputSchema } from "@/lib/validation/document";
import { explainText } from "@/lib/ai/explain";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/documents/[id]/explain">,
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

  const parsed = explainTextInputSchema
    .omit({ documentId: true })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: z.prettifyError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const result = await explainText(id, parsed.data.selectedText, parsed.data.mode);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err, 502);
  }
}
