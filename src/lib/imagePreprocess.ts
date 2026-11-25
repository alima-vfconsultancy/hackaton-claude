/** Pré-processamento no navegador (canvas) para melhorar o OCR. */

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* cai para <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

function drawScaled(src: ImageBitmap | HTMLImageElement, maxDim: number): HTMLCanvasElement {
  const w = 'naturalWidth' in src ? src.naturalWidth : src.width;
  const h = 'naturalHeight' in src ? src.naturalHeight : src.height;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Escala de cinza + estiramento de contraste (ignora 1% mais escuro/claro). */
export function grayscaleAndContrast(data: Uint8ClampedArray): void {
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const g = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = data[i + 1] = data[i + 2] = g;
    hist[g]++;
  }
  const total = data.length / 4;
  let acc = 0;
  let lo = 0;
  let hi = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= total * 0.01) { lo = v; break; }
  }
  acc = 0;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc >= total * 0.01) { hi = v; break; }
  }
  if (hi - lo < 30) return; // imagem sem contraste útil: mantém em cinza
  const k = 255 / (hi - lo);
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.max(0, Math.min(255, (data[i] - lo) * k));
    data[i] = data[i + 1] = data[i + 2] = v;
  }
}

export interface Preprocessed {
  /** Imagem em cinza/contraste, enviada ao OCR. */
  ocrBlob: Blob;
  /** Foto reduzida em cores, para exibir na revisão. */
  previewDataUrl: string;
}

export async function preprocessForOcr(file: Blob): Promise<Preprocessed> {
  const bmp = await loadBitmap(file);
  const preview = drawScaled(bmp, 1000);
  const previewDataUrl = preview.toDataURL('image/jpeg', 0.8);

  const canvas = drawScaled(bmp, 1800);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  grayscaleAndContrast(img.data);
  ctx.putImageData(img, 0, 0);
  const ocrBlob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao preparar a imagem.'))), 'image/png'),
  );
  if ('close' in bmp) bmp.close();
  return { ocrBlob, previewDataUrl };
}

/** Miniatura JPEG comprimida (usada só se o usuário marcar "Guardar foto da receita"). */
export async function makeThumbnail(dataUrl: string, maxDim = 480, quality = 0.6): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const bmp = await loadBitmap(blob);
  const canvas = drawScaled(bmp, maxDim);
  if ('close' in bmp) bmp.close();
  return canvas.toDataURL('image/jpeg', quality);
}
