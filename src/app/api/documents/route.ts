import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { createDocument, listDocumentsForUser } from "@/lib/db/queries";
import { getStorage, makeStorageKey } from "@/lib/storage";
import { isAcceptedFile } from "@/lib/validation/document";
import { getEnv } from "@/lib/env";
import { processDocument } from "@/lib/documents/process";

export async function GET() {
  const userId = getCurrentUserId();
  const docs = await listDocumentsForUser(userId);
  return NextResponse.json({ documents: docs });
}

export async function POST(request: Request) {
  const userId = getCurrentUserId();
  const { MAX_FILE_SIZE_MB } = getEnv();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was provided." }, { status: 400 });
  }

  if (!isAcceptedFile(file.type, file.name)) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a PDF or TXT file." },
      { status: 415 },
    );
  }

  const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File is too large. The limit is ${MAX_FILE_SIZE_MB}MB.` },
      { status: 413 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "This file is empty." }, { status: 400 });
  }

  const documentId = crypto.randomUUID();
  const mimeType = file.type || (file.name.endsWith(".txt") ? "text/plain" : "application/pdf");
  const storageKey = makeStorageKey(documentId, file.name);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await getStorage().save(storageKey, buffer);

    const doc = await createDocument({
      id: documentId,
      userId,
      title: file.name.replace(/\.(pdf|txt)$/i, ""),
      filename: file.name,
      mimeType,
      fileSize: file.size,
      status: "uploaded",
      storageKey,
    });

    // Kick off processing without blocking the response — the client polls
    // GET /api/documents/[id] for status. processDocument() always resolves
    // to a terminal status itself, so a failure here still surfaces to the UI.
    void processDocument(documentId, storageKey);

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: `Upload failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
