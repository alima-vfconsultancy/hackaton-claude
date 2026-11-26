/** Box of a recognized line, in pixels of the image sent to the OCR. */
export interface OcrBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** One line of text recognized by the OCR, with its confidence (0..100) and position. */
export interface OcrLine {
  text: string;
  confidence: number;
  bbox: OcrBox;
}

/** Result of one OCR pass over one image variant. */
export interface OcrPassResult {
  lines: OcrLine[];
  /** Mean confidence of the page (0..100). */
  confidence: number;
}

/** A line read by a single pass is kept only from this confidence on (below it is usually noise). */
const MIN_SINGLE_PASS_CONFIDENCE = 50;
/** Two boxes are the same line when their heights overlap at least this much (intersection over union)... */
const MIN_VERTICAL_OVERLAP = 0.5;
/** ...and they share at least this fraction of the narrower width. */
const MIN_HORIZONTAL_OVERLAP = 0.3;

function verticalOverlap(a: OcrBox, b: OcrBox): number {
  const intersection = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  if (intersection <= 0) return 0;
  return intersection / (Math.max(a.y1, b.y1) - Math.min(a.y0, b.y0));
}

function horizontalOverlap(a: OcrBox, b: OcrBox): number {
  const intersection = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  if (intersection <= 0) return 0;
  return intersection / Math.max(1, Math.min(a.x1 - a.x0, b.x1 - b.x0));
}

const isSameLine = (a: OcrBox, b: OcrBox) =>
  verticalOverlap(a, b) >= MIN_VERTICAL_OVERLAP && horizontalOverlap(a, b) >= MIN_HORIZONTAL_OVERLAP;

/** Top to bottom; lines on the same row go left to right. */
function inReadingOrder(lines: OcrLine[]): OcrLine[] {
  const rows: OcrLine[][] = [];
  for (const line of [...lines].sort((a, b) => a.bbox.y0 - b.bbox.y0)) {
    const row = rows[rows.length - 1];
    if (row && verticalOverlap(row[0].bbox, line.bbox) >= MIN_VERTICAL_OVERLAP) row.push(line);
    else rows.push([line]);
  }
  return rows.flatMap((row) => row.sort((a, b) => a.bbox.x0 - b.bbox.x0));
}

/**
 * Combines the lines read from several variants of the same photo (e.g. grayscale and
 * binarized). Lines whose boxes overlap are the same line: the most confident version wins.
 * A line that only one pass read is kept when its confidence is good enough.
 * With a single pass every non-empty line is kept.
 *
 * @param passes - lines of each OCR pass, all in the same image coordinates
 * @returns the merged text, one line per row, in reading order
 */
export function mergeOcrLines(passes: OcrLine[][]): string {
  const candidates = passes.flatMap((lines, pass) =>
    lines.filter((line) => line.text.trim()).map((line) => ({ line: { ...line, text: line.text.trim() }, pass })),
  );

  const kept: OcrLine[] = [];
  for (const { line, pass } of [...candidates].sort((a, b) => b.line.confidence - a.line.confidence)) {
    if (kept.some((other) => isSameLine(other.bbox, line.bbox))) continue;
    const isConfirmedByAnotherPass = candidates.some((other) => other.pass !== pass && isSameLine(other.line.bbox, line.bbox));
    if (passes.length > 1 && !isConfirmedByAnotherPass && line.confidence < MIN_SINGLE_PASS_CONFIDENCE) continue;
    kept.push(line);
  }
  return inReadingOrder(kept)
    .map((line) => line.text)
    .join('\n');
}
