import { describe, expect, it } from 'vitest';
import { createGrayImage, rgbaToGray, grayToRgba, type GrayImage } from './grayImage';
import { stretchContrast } from './contrast';
import { medianFilter3x3 } from './median';
import { normalizeIllumination } from './illumination';
import { sauvolaBinarize } from './sauvola';
import { estimateSkewAngle } from './skew';
import { computeOcrScale } from './scale';
import { enhanceForOcr } from './pipeline';

/** Builds a gray image from a function of (x, y). */
function makeImage(width: number, height: number, pixel: (x: number, y: number) => number): GrayImage {
  const image = createGrayImage(width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) image.data[y * width + x] = pixel(x, y);
  return image;
}

const at = (image: GrayImage, x: number, y: number) => image.data[y * image.width + x];

/**
 * Paper lit from the left (bright) to the right (shadow), with dark "text" strokes
 * every 10 columns whose ink is 40% of the local paper brightness.
 */
const isInk = (x: number, y: number) => x % 10 < 2 && y % 12 >= 3 && y % 12 < 9;
const paper = (x: number) => Math.round(240 - (x / 119) * 150); // 240 .. 90
const shadowedPage = () => makeImage(120, 48, (x, y) => (isInk(x, y) ? Math.round(paper(x) * 0.4) : paper(x)));

describe('gray image conversion', () => {
  it('converts RGBA to gray with luminance weights and back', () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]);
    const gray = rgbaToGray(rgba, 2, 1);
    expect(Array.from(gray.data)).toEqual([76, 29]);
    expect(Array.from(grayToRgba(gray))).toEqual([76, 76, 76, 255, 29, 29, 29, 255]);
  });
});

describe('stretchContrast', () => {
  it('stretches a low-contrast image to the full range', () => {
    const image = makeImage(100, 1, (x) => (x < 50 ? 100 : 160));
    stretchContrast(image);
    expect(at(image, 0, 0)).toBe(0);
    expect(at(image, 50, 0)).toBe(255);
  });

  it('keeps the values when there is no useful contrast', () => {
    const image = makeImage(10, 1, () => 120);
    stretchContrast(image);
    expect(at(image, 0, 0)).toBe(120);
  });
});

describe('medianFilter3x3', () => {
  it('removes isolated salt-and-pepper specks', () => {
    const image = makeImage(9, 9, () => 200);
    image.data[4 * 9 + 4] = 0;
    image.data[2 * 9 + 6] = 255;
    const filtered = medianFilter3x3(image);
    expect(at(filtered, 4, 4)).toBe(200);
    expect(at(filtered, 6, 2)).toBe(200);
  });

  it('keeps straight edges and text strokes thicker than one pixel', () => {
    const image = makeImage(10, 10, (x) => (x < 5 ? 0 : 255));
    const filtered = medianFilter3x3(image);
    expect(at(filtered, 4, 5)).toBe(0);
    expect(at(filtered, 5, 5)).toBe(255);
  });
});

describe('normalizeIllumination', () => {
  it('flattens a shadowed background so a single threshold separates ink from paper', () => {
    const image = shadowedPage();
    const normalized = normalizeIllumination(image);
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        if (isInk(x, y)) expect(at(normalized, x, y)).toBeLessThan(140);
        else expect(at(normalized, x, y)).toBeGreaterThan(200);
      }
    }
  });
});

describe('sauvolaBinarize', () => {
  it('separates ink from paper under a shadow where a global threshold fails', () => {
    const image = shadowedPage();

    // A global threshold misclassifies part of the page (shadowed paper turns into "ink").
    const globalErrors = image.data.reduce((errors, value, index) => {
      const x = index % image.width;
      const y = Math.floor(index / image.width);
      return errors + Number((value < 128) !== isInk(x, y));
    }, 0);
    expect(globalErrors).toBeGreaterThan(0);

    const binary = sauvolaBinarize(image, { windowSize: 15 });
    let errors = 0;
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const value = at(binary, x, y);
        expect([0, 255]).toContain(value);
        errors += Number((value === 0) !== isInk(x, y));
      }
    }
    expect(errors).toBe(0);
  });

  it('keeps an empty page white', () => {
    const binary = sauvolaBinarize(makeImage(30, 30, () => 180), { windowSize: 15 });
    expect(binary.data.every((value) => value === 255)).toBe(true);
  });
});

describe('estimateSkewAngle', () => {
  /** White page with horizontal "text lines" (dashed strokes) rotated by `degrees`. */
  function tiltedLines(degrees: number): GrayImage {
    const tangent = Math.tan((degrees * Math.PI) / 180);
    return makeImage(300, 220, (x, y) => {
      for (let baseline = 30; baseline < 200; baseline += 22) {
        const lineY = baseline + (x - 150) * tangent;
        if (Math.abs(y - lineY) < 3 && x % 9 < 6 && x > 20 && x < 280) return 20;
      }
      return 240;
    });
  }

  it.each([0, 5, -8, 12])('finds a %d° tilt within 1°', (degrees) => {
    expect(Math.abs(estimateSkewAngle(tiltedLines(degrees)) - degrees)).toBeLessThanOrEqual(1);
  });

  it('returns 0 for a blank page', () => {
    expect(estimateSkewAngle(makeImage(100, 100, () => 255))).toBe(0);
  });
});

describe('computeOcrScale', () => {
  it('shrinks big phone photos to the maximum long side', () => {
    expect(computeOcrScale(4000, 3000)).toBeCloseTo(2400 / 4000);
  });

  it('enlarges small images so the letters get big enough, at most 2x', () => {
    expect(computeOcrScale(1000, 700)).toBeCloseTo(1500 / 700 > 2 ? 2 : 1500 / 700);
    expect(computeOcrScale(500, 400)).toBe(2);
  });

  it('never enlarges past the maximum long side', () => {
    expect(computeOcrScale(2000, 1000)).toBeCloseTo(1.2);
  });

  it('keeps images that are already a good size', () => {
    expect(computeOcrScale(2000, 1600)).toBe(1);
  });
});

describe('enhanceForOcr', () => {
  it('removes specks and shadows, leaving dark ink on white paper', () => {
    const image = shadowedPage();
    image.data[5 * 120 + 105] = 0; // speck on the shadowed paper
    const enhanced = enhanceForOcr(image);
    expect(at(enhanced, 105, 5)).toBeGreaterThan(200);
    expect(at(enhanced, 110, 4)).toBeLessThan(80); // ink in the shadow
    expect(at(enhanced, 5, 1)).toBeGreaterThan(240); // bright paper
  });
});
