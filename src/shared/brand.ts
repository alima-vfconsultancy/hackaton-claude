/**
 * Dose Certa brand: user-facing name, tagline and color tokens (see CLAUDE.md, "Identidade visual").
 *
 * The same colors are declared in `tailwind.config.js` and `scripts/brand-symbol.mjs` (plain JS that cannot
 * import TypeScript); `src/brandIdentity.test.ts` keeps the copies in sync.
 */

/** Name shown to the user (title, manifest, PDF, calendar). Internal ids stay `meu-remedio`. */
export const APP_NAME = 'Dose Certa';

/** Brand tagline, shown under the logo. */
export const APP_TAGLINE = 'Seu remédio na hora certa.';

/** The six brand colors. Amber is a fill for highlights and alerts, never a text color. */
export const BRAND_COLORS = {
  /** Petróleo: brand, primary buttons, titles. */
  petroleum: '#0B5F6B',
  /** Âmbar: highlights and alerts, always with graphite text. */
  amber: '#F2A23A',
  /** Menta: soft backgrounds. */
  mint: '#E6F4F1',
  /** Grafite: main text. */
  graphite: '#1F2D30',
  /** Cinza: secondary text. */
  gray: '#4B5B5E',
  /** Névoa: app background. */
  mist: '#F7FBFA',
} as const;

/** A color as `#RRGGBB`. */
export type HexColor = `#${string}`;

function relativeLuminance(color: HexColor): number {
  const channels = [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG 2.x contrast ratio between two colors (1 to 21). Text needs at least 4.5 for level AA.
 *
 * @param first - one of the colors, as `#RRGGBB`
 * @param second - the other color, as `#RRGGBB`
 */
export function contrastRatio(first: HexColor, second: HexColor): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}
