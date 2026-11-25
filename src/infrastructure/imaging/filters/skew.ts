import type { GrayImage } from './grayImage';

/** Dark pixels sampled to estimate the tilt (keeps it fast on big photos). */
const MAX_POINTS = 40_000;

/** Sharpness of the horizontal projection: high when the text lines are aligned with the angle. */
function projectionScore(xs: Float64Array, ys: Float64Array, degrees: number, offset: number, bins: Float64Array): number {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  bins.fill(0);
  for (let i = 0; i < xs.length; i++) bins[Math.round(ys[i] * cos - xs[i] * sin + offset)]++;
  let score = 0;
  for (const count of bins) score += count * count;
  return score;
}

/**
 * Estimates how much the text of a photo is tilted, by finding the angle whose
 * horizontal projection of the dark pixels has the sharpest peaks (aligned text lines).
 *
 * @param image - gray or binarized image with dark text
 * @param maxDegrees - largest tilt searched, in both directions
 * @returns tilt in degrees (positive = lines go down to the right); rotate by the
 *   opposite angle to straighten. 0 when there is not enough text.
 */
export function estimateSkewAngle(image: GrayImage, maxDegrees = 15): number {
  const { width, height, data } = image;
  let dark = 0;
  for (const value of data) if (value < 128) dark++;
  if (dark < 50) return 0;

  const step = Math.max(1, Math.ceil(dark / MAX_POINTS));
  const xs = new Float64Array(Math.ceil(dark / step));
  const ys = new Float64Array(xs.length);
  let count = 0;
  for (let p = 0, seen = 0; p < data.length && count < xs.length; p++) {
    if (data[p] >= 128) continue;
    if (seen++ % step) continue;
    xs[count] = p % width;
    ys[count] = Math.floor(p / width);
    count++;
  }
  const pointsX = xs.subarray(0, count);
  const pointsY = ys.subarray(0, count);
  const offset = width + 1;
  const bins = new Float64Array(width + height + 2 * offset);

  let best = 0;
  let bestScore = -1;
  const search = (from: number, to: number, increment: number) => {
    for (let degrees = from; degrees <= to + 1e-9; degrees += increment) {
      const score = projectionScore(pointsX, pointsY, degrees, offset, bins);
      if (score > bestScore) {
        bestScore = score;
        best = degrees;
      }
    }
  };
  search(-maxDegrees, maxDegrees, 0.5);
  search(best - 0.5, best + 0.5, 0.1);
  return Math.round(best * 10) / 10 || 0;
}
