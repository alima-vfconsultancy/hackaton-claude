import type { Worker } from 'tesseract.js';
import { OcrCancelledError } from '../../application/errors';
import type { OcrEngine } from '../../application/ports';

/**
 * OCR running 100% in the browser with Tesseract.js (Portuguese).
 * Worker and wasm core come from the app's own origin (`/tesseract`, precached by the service worker);
 * only the Portuguese language data is downloaded on the first reading and then cached.
 */
export function createTesseractOcrEngine(): OcrEngine {
  return {
    recognize(image, onProgress) {
      let worker: Worker | null = null;
      let cancelled = false;

      const terminateWorker = async () => {
        const current = worker;
        worker = null;
        await current?.terminate();
      };

      const result = (async () => {
        onProgress({ stage: 'preparing', percent: 0 });
        const { createWorker } = await import('tesseract.js');
        worker = await createWorker('por', 1, {
          workerPath: '/tesseract/worker.min.js',
          corePath: '/tesseract/',
          logger: (message) => {
            if (message.status === 'recognizing text') onProgress({ stage: 'reading', percent: Math.round(message.progress * 100) });
            else onProgress({ stage: 'preparing', percent: Math.round((message.progress ?? 0) * 100) });
          },
        });
        try {
          if (cancelled) throw new OcrCancelledError();
          const { data } = await worker.recognize(image);
          return data.text;
        } catch (error) {
          // Terminating the worker mid-recognition rejects with an unrelated error: report it as a cancellation.
          throw cancelled ? new OcrCancelledError() : error;
        } finally {
          await terminateWorker();
        }
      })();

      return {
        result,
        cancel: async () => {
          cancelled = true;
          await terminateWorker();
        },
      };
    },
  };
}
