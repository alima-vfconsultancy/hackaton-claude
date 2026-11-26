import { stretchContrast } from './contrast';
import type { GrayImage } from './grayImage';
import { normalizeIllumination } from './illumination';
import { medianFilter3x3 } from './median';

/**
 * Cleans a gray prescription photo for the OCR: removes specks (median), flattens shadows
 * and uneven light (illumination normalization) and stretches the contrast.
 *
 * @param image - gray photo (not changed)
 * @returns a new image with dark ink on near-white paper
 */
export function enhanceForOcr(image: GrayImage): GrayImage {
  const enhanced = normalizeIllumination(medianFilter3x3(image));
  stretchContrast(enhanced);
  return enhanced;
}
