import { describe, expect, it } from 'vitest';
import { NAV_ITEMS } from './BottomNav';

describe('BottomNav', () => {
  it('shows the five main sections in order, with Alergias in place of Exportar', () => {
    expect(NAV_ITEMS.map(({ to, label }) => [to, label])).toEqual([
      ['/', 'Hoje'],
      ['/calendario', 'Calendário'],
      ['/historico', 'Histórico'],
      ['/alergias', 'Alergias'],
      ['/configuracoes', 'Ajustes'],
    ]);
  });

  it('keeps at most five items so labels stay readable at 360px', () => {
    expect(NAV_ITEMS.length).toBeLessThanOrEqual(5);
  });

  it('no longer has an Exportar item (it lives in Ajustes)', () => {
    expect(NAV_ITEMS.some(({ to }) => to === '/exportar')).toBe(false);
  });
});
