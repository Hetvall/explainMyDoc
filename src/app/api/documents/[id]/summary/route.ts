import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { summaries } from "@/lib/db/schema";
import { getSummaryForDocument } from "@/lib/db/queries";
import { requireProcessedDocument, toErrorResponse } from "@/lib/api/guard";
import { generateSummary } from "@/lib/ai/summary";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/documents/[id]/summary">,
) {
  const { id } = await ctx.params;
  const guard = await requireProcessedDocument(id);
  if ("error" in guard) return guard.error;

  const existing = await getSummaryForDocument(id);
  return NextResponse.json({ summary: existing?.summary ?? null });
}

/** Generates a summary and caches it — subsequent GETs (or re-visits) reuse the cached row. */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/documents/[id]/summary">,
) {
  const { id } = await ctx.params;
  const guard = await requireProcessedDocument(id);
  if ("error" in guard) return guard.error;

  try {
    const summary = await generateSummary(id);

    await db
      .insert(summaries)
      .values({ documentId: id, summary })
      .onConflictDoUpdate({ target: summaries.documentId, set: { summary } });

    return NextResponse.json({ summary });
  } catch (err) {
    return toErrorResponse(err, 502);
  }
}
