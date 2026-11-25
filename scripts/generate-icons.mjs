// Gera os ícones do PWA da marca Dose Certa (sem dependências): SVG e PNGs 192, 512 e maskable 512.
// A geometria e as cores do símbolo ficam em scripts/brand-symbol.mjs.
import { mkdirSync, writeFileSync } from 'node:fs';
import { iconSvg, renderIconPng } from './brand-symbol.mjs';

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon.svg', iconSvg());
writeFileSync('public/icons/icon-192.png', renderIconPng(192, { maskable: false }));
writeFileSync('public/icons/icon-512.png', renderIconPng(512, { maskable: false }));
writeFileSync('public/icons/icon-maskable-512.png', renderIconPng(512, { maskable: true }));
console.log('Ícones gerados em public/icons');
