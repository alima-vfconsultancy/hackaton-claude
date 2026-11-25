// Gera icones PNG sem dependencias: fundo azul + capsula branca/azul-clara.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

function crc32(buf) {
  let c;
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, maskable) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  const s = size / 512;
  const capScale = maskable ? 0.8 : 1;
  const a = Math.PI / 4;
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x++) {
      const px = x / s - 256;
      const py = y / s - 256;
      const rx = (px * Math.cos(a) - py * Math.sin(a)) / capScale;
      const ry = (px * Math.sin(a) + py * Math.cos(a)) / capScale;
      let col = [29, 78, 216, 255];
      const hw = 100;
      const hh = 60;
      const dx = Math.max(Math.abs(rx) - (hw - hh), 0);
      const dy = Math.abs(ry);
      if (dx * dx + dy * dy <= hh * hh) col = rx > 0 ? [147, 197, 253, 255] : [255, 255, 255, 255];
      if (!maskable) {
        const cx = Math.max(Math.abs(px) - (256 - 96), 0);
        const cy = Math.max(Math.abs(py) - (256 - 96), 0);
        if (cx * cx + cy * cy > 96 * 96) col = [0, 0, 0, 0];
      }
      raw.set(col, y * stride + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192, false));
writeFileSync('public/icons/icon-512.png', png(512, false));
writeFileSync('public/icons/icon-maskable-512.png', png(512, true));
console.log('Icones gerados em public/icons');
