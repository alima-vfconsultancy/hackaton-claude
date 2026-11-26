import { createGrayImage, type GrayImage } from './grayImage';

export interface SauvolaOptions {
  /** Odd window size in pixels; defaults to 1/40 of the width (at least 15). */
  windowSize?: number;
  /** Sensitivity; higher values make fewer pixels black. */
  k?: number;
}

/** Dynamic range of the standard deviation for 8-bit images. */
const DEVIATION_RANGE = 128;

/**
 * Adaptive binarization (Sauvola): each pixel is compared with a threshold computed
 * from the mean and the standard deviation of its neighborhood, so text stays readable
 * under shadows and uneven light. Uses integral images (constant time per pixel).
 *
 * @param image - gray image with dark text on light paper (not changed)
 * @returns a new image with only 0 (ink) and 255 (paper)
 */
export function sauvolaBinarize(image: GrayImage, { windowSize, k = 0.34 }: SauvolaOptions = {}): GrayImage {
  const { width, height, data } = image;
  const size = windowSize ?? Math.max(15, Math.round(width / 40) | 1);
  const half = Math.floor(size / 2);
  const stride = width + 1;
  const sums = new Float64Array(stride * (height + 1));
  const squares = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    let rowSquares = 0;
    for (let x = 0; x < width; x++) {
      const value = data[y * width + x];
      rowSum += value;
      rowSquares += value * value;
      sums[(y + 1) * stride + x + 1] = sums[y * stride + x + 1] + rowSum;
      squares[(y + 1) * stride + x + 1] = squares[y * stride + x + 1] + rowSquares;
    }
  }

  const output = createGrayImage(width, height);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - half);
    const y1 = Math.min(height, y + half + 1);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - half);
      const x1 = Math.min(width, x + half + 1);
      const area = (x1 - x0) * (y1 - y0);
      const sum = sums[y1 * stride + x1] - sums[y0 * stride + x1] - sums[y1 * stride + x0] + sums[y0 * stride + x0];
      const squareSum =
        squares[y1 * stride + x1] - squares[y0 * stride + x1] - squares[y1 * stride + x0] + squares[y0 * stride + x0];
      const mean = sum / area;
      const deviation = Math.sqrt(Math.max(0, squareSum / area - mean * mean));
      const threshold = mean * (1 + k * (deviation / DEVIATION_RANGE - 1));
      output.data[y * width + x] = data[y * width + x] < threshold ? 0 : 255;
    }
  }
  return output;
}
