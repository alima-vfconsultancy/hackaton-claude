import { describe, expect, it, vi } from 'vitest';
import { OcrCancelledError } from '../../application/errors';
import type { OcrProgress } from '../../application/ports';
import type { OcrPassResult } from './mergeOcrLines';
import { createTesseractOcrEngine, type OcrWorkerFactory } from './tesseractOcrEngine';

const blob = (name: string) => new Blob([name]);
const pass = (text: string, confidence: number): OcrPassResult => ({
  confidence,
  lines: [{ text, confidence, bbox: { x0: 0, y0: 0, x1: 100, y1: 20 } }],
});

/** Fake worker that answers each image with the given result and records what it read. */
function fakeFactory(results: Map<Blob, OcrPassResult>) {
  const read: Blob[] = [];
  const terminate = vi.fn(async () => {});
  const factory: OcrWorkerFactory = async (onLog) => {
    onLog('loading', 1);
    return {
      async recognize(image) {
        read.push(image);
        onLog('recognizing', 0.5);
        onLog('recognizing', 1);
        return results.get(image)!;
      },
      terminate,
    };
  };
  return { factory, read, terminate };
}

describe('createTesseractOcrEngine', () => {
  it('reads every variant with the same worker and keeps the most confident line', async () => {
    const grayscale = blob('gray');
    const binarized = blob('binary');
    const { factory, read, terminate } = fakeFactory(new Map([[grayscale, pass('Dipir0na 5OO mg', 60)], [binarized, pass('Dipirona 500 mg', 88)]]));

    const text = await createTesseractOcrEngine(factory).recognize([grayscale, binarized], () => {}).result;

    expect(text).toBe('Dipirona 500 mg');
    expect(read).toEqual([grayscale, binarized]);
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it('skips the other variants when the first reading is already confident', async () => {
    const grayscale = blob('gray');
    const binarized = blob('binary');
    const { factory, read } = fakeFactory(new Map([[grayscale, pass('Dipirona 500 mg', 90)], [binarized, pass('x', 10)]]));

    const text = await createTesseractOcrEngine(factory).recognize([grayscale, binarized], () => {}).result;

    expect(text).toBe('Dipirona 500 mg');
    expect(read).toEqual([grayscale]);
  });

  it('reports the reading progress across all passes without going back', async () => {
    const images = [blob('a'), blob('b')];
    const { factory } = fakeFactory(new Map([[images[0], pass('a', 50)], [images[1], pass('b', 50)]]));
    const progress: OcrProgress[] = [];

    await createTesseractOcrEngine(factory).recognize(images, (value) => progress.push(value)).result;

    const reading = progress.filter((value) => value.stage === 'reading').map((value) => value.percent);
    expect(reading).toEqual([25, 50, 75, 100]);
    expect(progress[0]).toEqual({ stage: 'preparing', percent: 0 });
  });

  it('rejects with OcrCancelledError when cancelled during a reading', async () => {
    const image = blob('a');
    let releaseReading: () => void = () => {};
    const terminate = vi.fn(async () => releaseReading());
    const factory: OcrWorkerFactory = async () => ({
      recognize: () =>
        new Promise<OcrPassResult>((_, reject) => {
          releaseReading = () => reject(new Error('worker terminated'));
        }),
      terminate,
    });

    const job = createTesseractOcrEngine(factory).recognize([image], () => {});
    await new Promise((resolve) => setTimeout(resolve, 0));
    await job.cancel();

    await expect(job.result).rejects.toBeInstanceOf(OcrCancelledError);
    expect(terminate).toHaveBeenCalled();
  });
});
