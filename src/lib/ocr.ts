import type { Worker } from 'tesseract.js';

export interface OcrProgress {
  stage: 'preparing' | 'reading';
  /** 0..100 */
  percent: number;
}

export interface OcrJob {
  promise: Promise<string>;
  cancel: () => Promise<void>;
}

/**
 * OCR 100% no navegador. Worker e core (wasm) vêm da própria origem (/tesseract,
 * precacheados pelo service worker). Só os dados do idioma "por" são baixados
 * na primeira leitura e ficam em cache (Tesseract + service worker).
 */
export function recognizePrescription(image: Blob, onProgress: (p: OcrProgress) => void): OcrJob {
  let worker: Worker | null = null;
  let cancelled = false;

  const promise = (async () => {
    onProgress({ stage: 'preparing', percent: 0 });
    const { createWorker } = await import('tesseract.js');
    worker = await createWorker('por', 1, {
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract/',
      logger: (m) => {
        if (m.status === 'recognizing text') onProgress({ stage: 'reading', percent: Math.round(m.progress * 100) });
        else onProgress({ stage: 'preparing', percent: Math.round((m.progress ?? 0) * 100) });
      },
    });
    if (cancelled) throw new Error('cancelado');
    const { data } = await worker.recognize(image);
    await worker.terminate();
    worker = null;
    return data.text;
  })();

  return {
    promise,
    cancel: async () => {
      cancelled = true;
      if (worker) await worker.terminate();
    },
  };
}
