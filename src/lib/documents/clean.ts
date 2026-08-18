/**
 * Normalizes raw extracted text: collapses excess whitespace, fixes
 * hyphenated line-break artifacts common in PDF extraction, and strips
 * control characters — without altering the actual content/meaning.
 */
export function cleanText(raw: string): string {
  const withoutControlChars = stripControlCharacters(raw);
  return withoutControlChars
    .replace(/\r\n?/g, "\n")
    // Join words split across a line break by a hyphen, e.g. "under-\nstand" -> "understand".
    .replace(/(\w)-\n(\w)/g, "$1$2")
    // Collapse 3+ blank lines to a single paragraph break.
    .replace(/\n{3,}/g, "\n\n")
    // Collapse runs of horizontal whitespace.
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Removes non-printable control characters, keeping newline and tab. */
function stripControlCharacters(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const isNewlineOrTab = code === 10 || code === 9;
    const isControl = code < 32 || code === 127;
    if (isNewlineOrTab || !isControl) {
      result += text[i];
    }
  }
  return result;
}

export function countWords(text: string): number {
  const matches = text.match(/\S+/g);
  return matches ? matches.length : 0;
}

/** Rough reading-time estimate at ~220 words/minute, rounded up to the nearest minute. */
export function estimateReadingMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 220));
}
