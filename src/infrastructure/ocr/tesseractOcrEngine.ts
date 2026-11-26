import type { Page } from 'tesseract.js';
import { OcrCancelledError } from '../../application/errors';
import type { OcrEngine } from '../../application/ports';
import { mergeOcrLines, type OcrLine, type OcrPassResult } from './mergeOcrLines';

/** Minimal worker used by the engine (lets the tests run without downloading Tesseract). */
export interface OcrWorkerHandle {
  recognize(image: Blob): Promise<OcrPassResult>;
  terminate(): Promise<void>;
}

/** Creates a worker; `onLog` receives the loading and reading progress (0..1). */
export type OcrWorkerFactory = (onLog: (stage: 'loading' | 'recognizing', progress: number) => void) => Promise<OcrWorkerHandle>;

/** When a pass is at least this confident, the remaining image variants are skipped. */
const GOOD_ENOUGH_CONFIDENCE = 85;

function linesOf(page: Page): OcrLine[] {
  return (page.blocks ?? []).flatMap((block) =>
    block.paragraphs.flatMap((paragraph) => paragraph.lines.map(({ text, confidence, bbox }) => ({ text, confidence, bbox }))),
  );
}

/**
 * Tesseract.js worker (Portuguese). Worker and wasm core come from the app's own origin
 * (`/tesseract`, precached by the service worker); only the Portuguese language data is
 * downloaded on the first reading and then cached.
 */
const createTesseractWorker: OcrWorkerFactory = async (onLog) => {
  const { createWorker, PSM } = await import('tesseract.js');
  const worker = await createWorker('por', 1, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract/',
    logger: (message) => onLog(message.status === 'recognizing text' ? 'recognizing' : 'loading', message.progress ?? 0),
  });
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
    preserve_interword_spaces: '1',
    // Phone photos carry no reliable resolution; this matches the size the image is scaled to.
    user_defined_dpi: '300',
  });
  return {
    async recognize(image) {
      const { data } = await worker.recognize(image, {}, { blocks: true });
      return { lines: linesOf(data), confidence: data.confidence };
    },
    terminate: async () => {
      await worker.terminate();
    },
  };
};

/**
 * OCR running 100% in the browser. Reads each image variant of the same photo with a single
 * worker, stops early when a reading is already confident, and merges the passes keeping the
 * most confident version of each line (see `mergeOcrLines`).
 *
 * @param createWorker - worker factory; defaults to Tesseract.js
 */
export function createTesseractOcrEngine(createWorker: OcrWorkerFactory = createTesseractWorker): OcrEngine {
  return {
    recognize(images, onProgress) {
      let worker: OcrWorkerHandle | null = null;
      let cancelled = false;
      let passIndex = 0;
      let lastPercent = 0;

      const terminateWorker = async () => {
        const current = worker;
        worker = null;
        await current?.terminate();
      };

      const reportReading = (progress: number) => {
        const percent = Math.round(((passIndex + progress) / images.length) * 100);
        if (percent <= lastPercent) return;
        lastPercent = percent;
        onProgress({ stage: 'reading', percent });
      };

      const result = (async () => {
        onProgress({ stage: 'preparing', percent: 0 });
        const created = await createWorker((stage, progress) => {
          if (stage === 'recognizing') reportReading(progress);
          else if (passIndex === 0 && lastPercent === 0) onProgress({ stage: 'preparing', percent: Math.round(progress * 100) });
        });
        worker = created;
        try {
          const passes: OcrLine[][] = [];
          for (passIndex = 0; passIndex < images.length; passIndex++) {
            if (cancelled) throw new OcrCancelledError();
            const pass = await created.recognize(images[passIndex]);
            passes.push(pass.lines);
            if (pass.confidence >= GOOD_ENOUGH_CONFIDENCE) break;
          }
          if (cancelled) throw new OcrCancelledError();
          if (lastPercent < 100) onProgress({ stage: 'reading', percent: 100 });
          return mergeOcrLines(passes);
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
