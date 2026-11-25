import type { GrayImage } from './grayImage';

/**
 * Stretches the contrast in place, ignoring the darkest and brightest 1% of the pixels.
 * Images with no useful contrast (range under 30 levels) are left untouched.
 *
 * @param image - gray image, changed in place
 */
export function stretchContrast(image: GrayImage): void {
  const histogram = new Uint32Array(256);
  for (const value of image.data) histogram[value]++;
  const cut = image.data.length * 0.01;
  let low = 0;
  let high = 255;
  for (let value = 0, accumulated = 0; value < 256; value++) {
    accumulated += histogram[value];
    if (accumulated >= cut) { low = value; break; }
  }
  for (let value = 255, accumulated = 0; value >= 0; value--) {
    accumulated += histogram[value];
    if (accumulated >= cut) { high = value; break; }
  }
  if (high - low < 30) return;
  const factor = 255 / (high - low);
  for (let p = 0; p < image.data.length; p++) image.data[p] = (image.data[p] - low) * factor;
}
