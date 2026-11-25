import { describe, expect, it } from 'vitest';
import { grayscaleAndContrast } from './canvasImageProcessor';

/** Builds RGBA pixels from a list of [r, g, b] colors. */
const pixels = (colors: Array<[number, number, number]>) => new Uint8ClampedArray(colors.flatMap(([r, g, b]) => [r, g, b, 255]));

describe('grayscaleAndContrast', () => {
  it('converts colors to gray using luminance weights', () => {
    const data = pixels([[255, 0, 0]]);
    grayscaleAndContrast(data);
    expect(Array.from(data)).toEqual([76, 76, 76, 255]);
  });

  it('stretches a low-contrast image to the full range', () => {
    const colors: Array<[number, number, number]> = [];
    for (let i = 0; i < 100; i++) colors.push(i < 50 ? [100, 100, 100] : [160, 160, 160]);
    const data = pixels(colors);

    grayscaleAndContrast(data);

    expect(data[0]).toBe(0);
    expect(data[50 * 4]).toBe(255);
  });

  it('keeps the gray values when there is no useful contrast', () => {
    const data = pixels(Array.from({ length: 10 }, () => [120, 120, 120] as [number, number, number]));
    grayscaleAndContrast(data);
    expect(data[0]).toBe(120);
  });
});
