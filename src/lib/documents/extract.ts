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

async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
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
    throw new DocumentExtractionError(
      `Failed to read this PDF. It may be corrupted or password-protected. (${(err as Error).message})`,
    );
  }
}

export class DocumentExtractionError extends Error {}
