import { describe, expect, it } from 'vitest';
import { mergeOcrLines, type OcrLine } from './mergeOcrLines';

const line = (text: string, confidence: number, y0: number, x0 = 10, x1 = 300, height = 20): OcrLine => ({
  text,
  confidence,
  bbox: { x0, y0, x1, y1: y0 + height },
});

describe('mergeOcrLines', () => {
  it('keeps the most confident version of lines that overlap between passes', () => {
    const grayscale = [line('Amoxici1ina 5OO mg', 62, 100), line('Tomar 1 cápsula de 8/8h', 91, 140)];
    const binarized = [line('Amoxicilina 500 mg', 88, 102), line('Tomar 1 capsuia de 8/8h', 70, 141)];

    expect(mergeOcrLines([grayscale, binarized])).toBe('Amoxicilina 500 mg\nTomar 1 cápsula de 8/8h');
  });

  it('adds a line read by only one pass when its confidence is good enough', () => {
    const grayscale = [line('Losartana 50 mg', 90, 100)];
    const binarized = [line('Losartana 50 mg', 85, 100), line('Uso contínuo', 80, 140)];

    expect(mergeOcrLines([grayscale, binarized])).toBe('Losartana 50 mg\nUso contínuo');
  });

  it('drops a line read by only one pass when its confidence is too low (likely noise)', () => {
    const grayscale = [line('Losartana 50 mg', 90, 100)];
    const binarized = [line('Losartana 50 mg', 85, 100), line('~.;|', 20, 300)];

    expect(mergeOcrLines([grayscale, binarized])).toBe('Losartana 50 mg');
  });

  it('keeps every non-empty line of a single pass, whatever the confidence', () => {
    expect(mergeOcrLines([[line('Dipirona', 30, 50), line('   ', 90, 80), line('20 gotas', 40, 90)]])).toBe('Dipirona\n20 gotas');
  });

  it('does not treat side-by-side lines on the same row as the same line', () => {
    const left = line('Dr. João Silva', 80, 20, 10, 200);
    const right = line('CRM 12345', 75, 20, 400, 600);
    expect(mergeOcrLines([[left, right], [line('Dr. Joao Silva', 70, 20, 10, 200)]])).toBe('Dr. João Silva\nCRM 12345');
  });

  it('returns the lines in reading order (top to bottom, then left to right)', () => {
    const pass = [line('terceira', 90, 300), line('primeira', 90, 10), line('segunda B', 90, 150, 400, 600), line('segunda A', 90, 151, 10, 200)];
    expect(mergeOcrLines([pass])).toBe('primeira\nsegunda A\nsegunda B\nterceira');
  });

  it('returns an empty text when nothing was read', () => {
    expect(mergeOcrLines([[], []])).toBe('');
  });
});
