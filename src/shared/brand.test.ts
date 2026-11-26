import { describe, expect, it } from 'vitest';
import { APP_NAME, APP_TAGLINE, BRAND_COLORS, contrastRatio, type HexColor } from './brand';

const WHITE: HexColor = '#FFFFFF';
const AA_TEXT = 4.5;

describe('brand', () => {
  it('names the app Dose Certa with its tagline', () => {
    expect(APP_NAME).toBe('Dose Certa');
    expect(APP_TAGLINE).toBe('Seu remédio na hora certa.');
  });

  it('has exactly the six brand colors', () => {
    expect(BRAND_COLORS).toEqual({
      petroleum: '#0B5F6B',
      amber: '#F2A23A',
      mint: '#E6F4F1',
      graphite: '#1F2D30',
      gray: '#4B5B5E',
      mist: '#F7FBFA',
    });
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for a color on itself', () => {
    expect(contrastRatio('#000000', WHITE)).toBeCloseTo(21, 5);
    expect(contrastRatio(BRAND_COLORS.petroleum, BRAND_COLORS.petroleum)).toBeCloseTo(1, 5);
  });

  it('does not depend on the order of the colors', () => {
    expect(contrastRatio(WHITE, BRAND_COLORS.petroleum)).toBeCloseTo(contrastRatio(BRAND_COLORS.petroleum, WHITE), 10);
  });

  const { petroleum, amber, mint, graphite, gray, mist } = BRAND_COLORS;
  it.each<[string, HexColor, HexColor]>([
    ['white on petroleum (primary buttons)', WHITE, petroleum],
    ['graphite on amber (snoozed, warnings)', graphite, amber],
    ['graphite on mist (body text)', graphite, mist],
    ['gray on mist (secondary text)', gray, mist],
    ['gray on white (secondary text in cards)', gray, WHITE],
    ['petroleum on mint (active navigation)', petroleum, mint],
    ['petroleum on mist (titles)', petroleum, mist],
  ])('passes WCAG AA for %s', (_, text, background) => {
    expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('fails WCAG AA for light text on amber, which is why amber never carries light text', () => {
    expect(contrastRatio(WHITE, amber)).toBeLessThan(AA_TEXT);
    expect(contrastRatio(mist, amber)).toBeLessThan(AA_TEXT);
  });
});
