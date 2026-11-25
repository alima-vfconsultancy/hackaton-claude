import type { ImageProcessor, PreparedImage } from '../../application/ports';

/** Browser (canvas) image preprocessing to improve the OCR and to build thumbnails. */

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

function drawScaled(source: ImageBitmap | HTMLImageElement, maxDimension: number): HTMLCanvasElement {
  const width = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const height = 'naturalHeight' in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Converts RGBA pixels to grayscale in place and stretches the contrast
 * (ignoring the darkest and brightest 1%). Images with no useful contrast stay gray.
 *
 * @param data - RGBA pixel data, as in `ImageData.data`
 */
export function grayscaleAndContrast(data: Uint8ClampedArray): void {
  const histogram = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = data[i + 1] = data[i + 2] = gray;
    histogram[gray]++;
  }
  const total = data.length / 4;
  let accumulated = 0;
  let low = 0;
  let high = 255;
  for (let value = 0; value < 256; value++) {
    accumulated += histogram[value];
    if (accumulated >= total * 0.01) { low = value; break; }
  }
  accumulated = 0;
  for (let value = 255; value >= 0; value--) {
    accumulated += histogram[value];
    if (accumulated >= total * 0.01) { high = value; break; }
  }
  if (high - low < 30) return;
  const factor = 255 / (high - low);
  for (let i = 0; i < data.length; i += 4) {
    const stretched = Math.max(0, Math.min(255, (data[i] - low) * factor));
    data[i] = data[i + 1] = data[i + 2] = stretched;
  }
}

async function prepareForOcr(file: Blob): Promise<PreparedImage> {
  const bitmap = await loadBitmap(file);
  const previewDataUrl = drawScaled(bitmap, 1000).toDataURL('image/jpeg', 0.8);

  const canvas = drawScaled(bitmap, 1800);
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  grayscaleAndContrast(image.data);
  context.putImageData(image, 0, 0);
  const ocrBlob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not prepare the image.'))), 'image/png'),
  );
  if ('close' in bitmap) bitmap.close();
  return { ocrBlob, previewDataUrl };
}

async function createThumbnail(dataUrl: string, maxDimension = 480, quality = 0.6): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const bitmap = await loadBitmap(blob);
  const canvas = drawScaled(bitmap, maxDimension);
  if ('close' in bitmap) bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
}

/** Image processor backed by the browser canvas (grayscale + contrast for OCR, JPEG thumbnails). */
export const createCanvasImageProcessor = (): ImageProcessor => ({ prepareForOcr, createThumbnail });
