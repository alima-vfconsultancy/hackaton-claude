export interface OcrScaleOptions {
  /** Small images are enlarged until the shorter side reaches this size. */
  minShortSide?: number;
  /** Large images are reduced until the longer side fits this size. */
  maxLongSide?: number;
  /** Largest enlargement factor. */
  maxUpscale?: number;
}

/**
 * Chooses the resize factor that gives the OCR letters of a good size: big phone photos
 * are reduced (faster, less memory) and small images are enlarged (up to 2x).
 *
 * @param width - original width
 * @param height - original height
 * @returns factor to multiply both sides by (1 = keep)
 */
export function computeOcrScale(
  width: number,
  height: number,
  { minShortSide = 1500, maxLongSide = 2400, maxUpscale = 2 }: OcrScaleOptions = {},
): number {
  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);
  if (longSide > maxLongSide) return maxLongSide / longSide;
  if (shortSide < minShortSide) return Math.min(maxUpscale, minShortSide / shortSide, maxLongSide / longSide);
  return 1;
}
