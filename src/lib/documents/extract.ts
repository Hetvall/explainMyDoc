import { getDocumentProxy, extractText as extractPdfText } from "unpdf";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractionResult {
  pages: ExtractedPage[];
  fullText: string;
}

/**
 * Extracts text from a document buffer. PDF and TXT are supported today;
 * DOCX has an obvious slot here (mammoth or similar) once needed — the
 * pipeline downstream (clean → chunk → embed) is format-agnostic, it only
 * consumes { pages, fullText }.
 */
export async function extractDocumentText(
  buffer: Buffer,
  mimeType: string,
): Promise<ExtractionResult> {
  if (mimeType === "text/plain") {
    return extractTxt(buffer);
  }
  if (mimeType === "application/pdf") {
    return extractPdf(buffer);
  }
  throw new DocumentExtractionError(`Unsupported file type: ${mimeType}`);
}

async function extractTxt(buffer: Buffer): Promise<ExtractionResult> {
  const text = buffer.toString("utf-8");
  if (!text.trim()) {
    throw new DocumentExtractionError("The uploaded file is empty.");
  }
  return { pages: [{ pageNumber: 1, text }], fullText: text };
}

const PDF_MAGIC = Buffer.from("%PDF-", "utf-8");

async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  // PDF.js will eventually reject non-PDF bytes too, but its error messages
  // are generic ("Invalid PDF structure.") and don't distinguish "this isn't
  // a PDF at all" from a real parse failure. Checking the header up front
  // lets us give a precise, actionable message for the common case of a
  // renamed/non-PDF file.
  if (!buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    throw new DocumentExtractionError(
      "This file isn't a valid PDF (its contents don't start with a PDF header). It may be corrupted or renamed from another file type.",
    );
  }

  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractPdfText(pdf, { mergePages: false });

    const pages: ExtractedPage[] = text.map((pageText, index) => ({
      pageNumber: index + 1,
      text: pageText,
    }));

    const fullText = pages.map((p) => p.text).join("\n\n");
    if (!fullText.trim()) {
      throw new DocumentExtractionError(
        "No readable text was found in this PDF. It may be a scanned image without OCR text.",
      );
    }

    return { pages, fullText };
  } catch (err) {
    if (err instanceof DocumentExtractionError) throw err;
    const cause = err as Error & { name?: string };
    if (cause.name === "PasswordException") {
      throw new DocumentExtractionError(
        "This PDF is password-protected. Remove the password and upload it again.",
      );
    }
    throw new DocumentExtractionError(
      `Failed to read this PDF. It may be corrupted or password-protected. (${cause.name ?? "Error"}: ${cause.message})`,
    );
  }
}

export class DocumentExtractionError extends Error {}
