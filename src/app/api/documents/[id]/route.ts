import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { deleteDocument, getOwnedDocument } from "@/lib/db/queries";
import { getStorage } from "@/lib/storage";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/documents/[id]">,
) {
  const { id } = await ctx.params;
  const userId = getCurrentUserId();

  const doc = await getOwnedDocument(id, userId);
  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  return NextResponse.json({ document: doc });
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/documents/[id]">,
) {
  const { id } = await ctx.params;
  const userId = getCurrentUserId();

  const doc = await getOwnedDocument(id, userId);
  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  await getStorage().delete(doc.storageKey).catch(() => {});
  await deleteDocument(id, userId);

  return NextResponse.json({ success: true });
}
