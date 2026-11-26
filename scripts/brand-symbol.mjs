// Dose Certa symbol: a capsule tilted 45° (lower-left half + amber upper-right half) with a check mark.
// Single source of the symbol geometry for the PWA icons (PNG and SVG). The React logo
// (src/presentation/components/BrandLogo.tsx) repeats the same path data.
// Colors: keep in sync with src/shared/brand.ts.
import { deflateSync } from 'node:zlib';

const PETROLEUM = '#0B5F6B';
const AMBER = '#F2A23A';
const GRAPHITE = '#1F2D30';
const WHITE = '#FFFFFF';

/** Colors of the app icon (negative version of the symbol on a petroleum background). */
export const ICON_COLORS = { background: PETROLEUM, capsuleBase: WHITE, capsuleTop: AMBER, check: PETROLEUM };

// Geometry in a 512×512 frame. The capsule is drawn horizontally around the center, then rotated -45°.
const CENTER = 256;
const RADIUS = 96; // capsule radius
const HALF_SPAN = 111.5; // distance from the center to each end circle
const CHECK = [[260, 224], [288, 250], [334, 192]]; // already in the rotated (final) frame
const CHECK_WIDTH = 24;
const ICON_CORNER = 112;
const MASKABLE_SCALE = 0.8; // keeps the symbol inside the 80% safe zone of maskable icons

const BASE_HALF = `M256 160H${CENTER - HALF_SPAN}A96 96 0 0 0 ${CENTER - HALF_SPAN} 352H256Z`;
const TOP_HALF = `M256 160H${CENTER + HALF_SPAN}A96 96 0 0 1 ${CENTER + HALF_SPAN} 352H256Z`;
const CHECK_PATH = `M${CHECK.map(([x, y]) => `${x} ${y}`).join('L')}`;

const VARIANTS = {
  light: { base: `fill="${PETROLEUM}"`, top: `fill="${AMBER}"`, check: PETROLEUM },
  negative: { base: `fill="${WHITE}"`, top: `fill="${AMBER}"`, check: PETROLEUM },
  mono: { base: `fill="${GRAPHITE}"`, top: `fill="${WHITE}" stroke="${GRAPHITE}" stroke-width="16"`, check: GRAPHITE },
};

function symbolShapes(variant) {
  const colors = VARIANTS[variant];
  if (!colors) throw new Error(`Unknown symbol variant: ${variant}`);
  return (
    `<g transform="rotate(-45 ${CENTER} ${CENTER})"><path d="${BASE_HALF}" ${colors.base}/><path d="${TOP_HALF}" ${colors.top}/></g>` +
    `<path d="${CHECK_PATH}" fill="none" stroke="${colors.check}" stroke-width="${CHECK_WIDTH}" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

/**
 * SVG of the symbol alone, cropped to the capsule.
 * @param {'light' | 'negative' | 'mono'} variant - light backgrounds, dark backgrounds or black-and-white print
 */
export function symbolSvg(variant) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="72 72 368 368">${symbolShapes(variant)}</svg>`;
}

/** SVG of the app icon: rounded petroleum square with the negative symbol. */
export function iconSvg() {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
    `<rect width="512" height="512" rx="${ICON_CORNER}" fill="${PETROLEUM}"/>${symbolShapes('negative')}</svg>\n`
  );
}

// ---------- PNG rendering (no dependencies) ----------

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const SQRT1_2 = Math.SQRT1_2;

function distanceToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Color of one sample point in the 512 frame, or null when transparent. */
function sampleColor(x, y, maskable) {
  if (!maskable) {
    const cx = Math.max(Math.abs(x - CENTER) - (CENTER - ICON_CORNER), 0);
    const cy = Math.max(Math.abs(y - CENTER) - (CENTER - ICON_CORNER), 0);
    if (cx * cx + cy * cy > ICON_CORNER * ICON_CORNER) return null;
  }
  // Symbol coordinates (maskable icons shrink the symbol around the center).
  const scale = maskable ? MASKABLE_SCALE : 1;
  const sx = CENTER + (x - CENTER) / scale;
  const sy = CENTER + (y - CENTER) / scale;

  const checkDistance = Math.min(distanceToSegment(sx, sy, CHECK[0], CHECK[1]), distanceToSegment(sx, sy, CHECK[1], CHECK[2]));
  // Undo the -45° rotation to test the horizontal capsule.
  const rx = (sx - CENTER - (sy - CENTER)) * SQRT1_2;
  const ry = (sx - CENTER + (sy - CENTER)) * SQRT1_2;
  const along = Math.max(Math.abs(rx) - HALF_SPAN, 0);
  const inCapsule = along * along + ry * ry <= RADIUS * RADIUS;

  if (inCapsule && checkDistance <= CHECK_WIDTH / 2 && rx > 0) return ICON_COLORS.check;
  if (inCapsule) return rx > 0 ? ICON_COLORS.capsuleTop : ICON_COLORS.capsuleBase;
  return ICON_COLORS.background;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/**
 * Renders the app icon as an RGBA PNG, with 4×4 supersampling for smooth edges.
 * @param {number} size - width and height in pixels
 * @param {{ maskable: boolean }} options - maskable icons are full-bleed with the symbol in the safe zone
 * @returns {Buffer}
 */
export function renderIconPng(size, { maskable }) {
  const GRID = 4;
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  const unit = 512 / size;
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let covered = 0;
      for (let j = 0; j < GRID; j++) {
        for (let i = 0; i < GRID; i++) {
          const color = sampleColor((x + (i + 0.5) / GRID) * unit, (y + (j + 0.5) / GRID) * unit, maskable);
          if (!color) continue;
          const [cr, cg, cb] = rgb(color);
          r += cr;
          g += cg;
          b += cb;
          covered++;
        }
      }
      const offset = y * stride + 1 + x * 4;
      if (covered === 0) continue; // transparent (already zero)
      raw[offset] = Math.round(r / covered);
      raw[offset + 1] = Math.round(g / covered);
      raw[offset + 2] = Math.round(b / covered);
      raw[offset + 3] = Math.round((covered / (GRID * GRID)) * 255);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
