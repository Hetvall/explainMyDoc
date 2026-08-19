import { NextResponse, after } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { createDocument, ensureUser, listDocumentsForUser } from "@/lib/db/queries";
import { getStorage, makeStorageKey } from "@/lib/storage";
import { isAcceptedFile } from "@/lib/validation/document";
import { getEnv } from "@/lib/env";
import { processDocument } from "@/lib/documents/process";

// Document processing (extract -> embed -> persist) can run long enough to
// need more than the platform default on serverless.
export const maxDuration = 60;

export async function GET() {
  const userId = await getCurrentUserId();
  const docs = await listDocumentsForUser(userId);
  return NextResponse.json({ documents: docs });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
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

    // isAcceptedFile() above only checks the MIME type/extension the browser
    // reported, not the actual bytes. Catch an obviously-mislabeled file
    // (e.g. a .docx renamed to .pdf) here so the user gets an immediate,
    // specific error instead of waiting for the async pipeline to fail.
    if (mimeType === "application/pdf" && !buffer.subarray(0, 5).toString("utf-8").startsWith("%PDF-")) {
      return NextResponse.json(
        {
          error:
            "This file isn't a valid PDF (its contents don't start with a PDF header). It may be corrupted or renamed from another file type.",
        },
        { status: 415 },
      );
    }

    const storageRef = await getStorage().save(storageKey, buffer);

    await ensureUser(userId);
    const doc = await createDocument({
      id: documentId,
      userId,
      title: file.name.replace(/\.(pdf|txt)$/i, ""),
      filename: file.name,
      mimeType,
      fileSize: file.size,
      status: "uploaded",
      storageKey: storageRef,
    });

    // Kick off processing without blocking the response — the client polls
    // GET /api/documents/[id] for status. processDocument() always resolves
    // to a terminal status itself, so a failure here still surfaces to the UI.
    // after() (backed by Vercel's waitUntil in production) keeps the
    // invocation alive until this finishes, unlike a bare fire-and-forget
    // call which serverless platforms can kill right after the response.
    after(() => processDocument(documentId, storageRef));

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: `Upload failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
