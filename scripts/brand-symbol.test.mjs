import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { ICON_COLORS, renderIconPng, symbolSvg } from './brand-symbol.mjs';

/** Decodes the RGBA PNGs written by renderIconPng (filter 0 on every row). */
function decode(png) {
  expect(png.subarray(1, 4).toString('latin1')).toBe('PNG');
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const idat = [];
  for (let offset = 8; offset < png.length; ) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString('latin1');
    if (type === 'IDAT') idat.push(png.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4 + 1;
  const at = (x, y) => {
    const i = Math.round(y) * stride + 1 + Math.round(x) * 4;
    return [raw[i], raw[i + 1], raw[i + 2], raw[i + 3]];
  };
  return { width, height, at };
}

const hex = (rgba) => `#${rgba.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

describe('brand symbol icons', () => {
  it('uses the brand colors', () => {
    expect(ICON_COLORS).toEqual({ background: '#0B5F6B', capsuleBase: '#FFFFFF', capsuleTop: '#F2A23A', check: '#0B5F6B' });
  });

  it.each([192, 512])('renders a %ipx icon with the capsule on petroleum and rounded transparent corners', (size) => {
    const icon = decode(renderIconPng(size, { maskable: false }));
    const s = size / 512;
    expect([icon.width, icon.height]).toEqual([size, size]);
    expect(icon.at(0, 0)[3]).toBe(0); // rounded corner
    expect(hex(icon.at(40 * s, 256 * s))).toBe('#0B5F6B'); // background
    expect(hex(icon.at(170 * s, 342 * s))).toBe('#FFFFFF'); // lower-left half
    expect(hex(icon.at(345 * s, 168 * s))).toBe('#F2A23A'); // upper-right half
    expect(hex(icon.at(287 * s, 248 * s))).toBe('#0B5F6B'); // check mark
  });

  it('keeps the maskable icon fully opaque and the symbol inside the 80% safe zone', () => {
    const icon = decode(renderIconPng(512, { maskable: true }));
    expect(icon.at(0, 0)).toEqual([11, 95, 107, 255]);
    const safeRadius = 0.4 * 512;
    for (let angle = 0; angle < 360; angle += 5) {
      const a = (angle * Math.PI) / 180;
      const pixel = icon.at(256 + Math.cos(a) * (safeRadius + 2), 256 + Math.sin(a) * (safeRadius + 2));
      expect(hex(pixel)).toBe('#0B5F6B');
    }
  });

  it('exports an SVG of the symbol for the light, negative and monochrome versions', () => {
    expect(symbolSvg('light')).toContain('fill="#0B5F6B"');
    expect(symbolSvg('light')).toContain('fill="#F2A23A"');
    expect(symbolSvg('negative')).toContain('fill="#FFFFFF"');
    expect(symbolSvg('mono')).not.toMatch(/#F2A23A|#0B5F6B/);
  });
});
