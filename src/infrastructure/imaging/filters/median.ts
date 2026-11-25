import { createGrayImage, type GrayImage } from './grayImage';

/**
 * 3×3 median filter: removes isolated specks (paper grain, sensor noise) while keeping
 * edges and strokes thicker than one pixel. Borders repeat the nearest pixel.
 *
 * @param image - gray image (not changed)
 * @returns a new filtered image
 */
export function medianFilter3x3(image: GrayImage): GrayImage {
  const { width, height, data } = image;
  const output = createGrayImage(width, height);
  const window = new Uint8Array(9);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const row = Math.min(height - 1, Math.max(0, y + dy)) * width;
        for (let dx = -1; dx <= 1; dx++) {
          const value = data[row + Math.min(width - 1, Math.max(0, x + dx))];
          // Insertion sort: tiny window, faster than Array.sort.
          let position = count++;
          while (position > 0 && window[position - 1] > value) {
            window[position] = window[position - 1];
            position--;
          }
          window[position] = value;
        }
      }
      output.data[y * width + x] = window[4];
    }
  }
  return output;
}
