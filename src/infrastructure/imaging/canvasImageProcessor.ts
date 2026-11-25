import type { ImageProcessor, PreparedImage } from '../../application/ports';
import { grayToRgba, rgbaToGray, type GrayImage } from './filters/grayImage';
import { enhanceForOcr } from './filters/pipeline';
import { sauvolaBinarize } from './filters/sauvola';
import { computeOcrScale } from './filters/scale';
import { estimateSkewAngle } from './filters/skew';

/** Browser (canvas) image preprocessing to improve the OCR and to build thumbnails. Pixel filters live in `./filters`. */

/** Minimum tilt (degrees) worth straightening; smaller angles do not bother the OCR. */
const MIN_DESKEW_DEGREES = 0.5;

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* falls back to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not open the image.'));
      image.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

function sizeOf(source: ImageBitmap | HTMLImageElement): { width: number; height: number } {
  return 'naturalWidth' in source
    ? { width: source.naturalWidth, height: source.naturalHeight }
    : { width: source.width, height: source.height };
}

/** Draws the image resized by `scale` on a white canvas. */
function drawResized(source: ImageBitmap | HTMLImageElement, scale: number): HTMLCanvasElement {
  const { width, height } = sizeOf(source);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.imageSmoothingQuality = 'high';
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Draws the image reduced (never enlarged) so its longer side fits `maxDimension`. */
function drawScaled(source: ImageBitmap | HTMLImageElement, maxDimension: number): HTMLCanvasElement {
  const { width, height } = sizeOf(source);
  return drawResized(source, Math.min(1, maxDimension / Math.max(width, height)));
}

function grayFromCanvas(canvas: HTMLCanvasElement): GrayImage {
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  return rgbaToGray(data, canvas.width, canvas.height);
}

function canvasFromGray(image: GrayImage): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext('2d')!.putImageData(new ImageData(grayToRgba(image), image.width, image.height), 0, 0);
  return canvas;
}

/** Rotates by `degrees` around the center, on a white page large enough for the whole image. */
function rotateGray(image: GrayImage, degrees: number): GrayImage {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * cos + image.height * sin);
  canvas.height = Math.round(image.width * sin + image.height * cos);
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.imageSmoothingQuality = 'high';
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(radians);
  context.drawImage(canvasFromGray(image), -image.width / 2, -image.height / 2);
  return grayFromCanvas(canvas);
}

const toPngBlob = (image: GrayImage) =>
  new Promise<Blob>((resolve, reject) =>
    canvasFromGray(image).toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not prepare the image.'))), 'image/png'),
  );

/**
 * Builds the OCR variants of a photo: resized to a good letter size, specks and shadows
 * removed, straightened, then (1) enhanced grayscale and (2) adaptive black and white.
 */
async function prepareForOcr(file: Blob): Promise<PreparedImage> {
  const bitmap = await loadBitmap(file);
  const previewDataUrl = drawScaled(bitmap, 1000).toDataURL('image/jpeg', 0.8);

  const { width, height } = sizeOf(bitmap);
  let enhanced = enhanceForOcr(grayFromCanvas(drawResized(bitmap, computeOcrScale(width, height))));
  if ('close' in bitmap) bitmap.close();

  let binarized = sauvolaBinarize(enhanced);
  const tilt = estimateSkewAngle(binarized);
  if (Math.abs(tilt) >= MIN_DESKEW_DEGREES) {
    enhanced = rotateGray(enhanced, -tilt);
    binarized = sauvolaBinarize(enhanced);
  }

  const ocrBlobs = [await toPngBlob(enhanced), await toPngBlob(binarized)];
  return { ocrBlobs, previewDataUrl };
}

async function createThumbnail(dataUrl: string, maxDimension = 480, quality = 0.6): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const bitmap = await loadBitmap(blob);
  const canvas = drawScaled(bitmap, maxDimension);
  if ('close' in bitmap) bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
}

/** Image processor backed by the browser canvas (cleaned-up OCR variants, JPEG thumbnails). */
export const createCanvasImageProcessor = (): ImageProcessor => ({ prepareForOcr, createThumbnail });
