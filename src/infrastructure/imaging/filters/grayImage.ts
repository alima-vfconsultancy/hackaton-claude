/** Single-channel 8-bit image (one byte per pixel, row by row). Used by the OCR filters. */
export interface GrayImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/**
 * Creates a black gray image of the given size.
 *
 * @param width - width in pixels
 * @param height - height in pixels
 */
export function createGrayImage(width: number, height: number): GrayImage {
  return { width, height, data: new Uint8ClampedArray(width * height) };
}

/**
 * Converts RGBA pixels (as in `ImageData.data`) to gray using luminance weights.
 *
 * @param rgba - RGBA pixel data
 * @param width - image width
 * @param height - image height
 */
export function rgbaToGray(rgba: Uint8ClampedArray, width: number, height: number): GrayImage {
  const image = createGrayImage(width, height);
  for (let i = 0, p = 0; p < image.data.length; i += 4, p++) {
    image.data[p] = Math.round(0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]);
  }
  return image;
}

/**
 * Converts a gray image back to opaque RGBA pixels, ready for `ImageData`.
 *
 * @param image - gray image
 */
export function grayToRgba(image: GrayImage): Uint8ClampedArray<ArrayBuffer> {
  const rgba = new Uint8ClampedArray(image.data.length * 4);
  for (let p = 0, i = 0; p < image.data.length; p++, i += 4) {
    rgba[i] = rgba[i + 1] = rgba[i + 2] = image.data[p];
    rgba[i + 3] = 255;
  }
  return rgba;
}
