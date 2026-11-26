import { describe, expect, it } from 'vitest';
import { NAVIGATION_ITEMS, shouldShowNavigation } from './navigationItems';

describe('NAVIGATION_ITEMS', () => {
  it('shows the five main sections in order, with Alergias in place of Exportar', () => {
    // Short labels: at the 18px brand minimum, "Calendário" and "Histórico" overflow a 360px bar.
    expect(NAVIGATION_ITEMS.map(({ to, label }) => [to, label])).toEqual([
      ['/', 'Hoje'],
      ['/calendario', 'Agenda'],
      ['/historico', 'Registro'],
      ['/alergias', 'Alergias'],
      ['/configuracoes', 'Ajustes'],
    ]);
  });

  it('keeps at most five items so labels stay readable at 360px', () => {
    expect(NAVIGATION_ITEMS.length).toBeLessThanOrEqual(5);
  });

  it('no longer has an Exportar item (it lives in Ajustes)', () => {
    expect(NAVIGATION_ITEMS.some(({ to }) => to === '/exportar')).toBe(false);
  });

  it('has unique routes', () => {
    const routes = NAVIGATION_ITEMS.map(({ to }) => to);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('matches the home route exactly so it is not highlighted on every page', () => {
    const exactItems = NAVIGATION_ITEMS.filter(({ end }) => end).map(({ to }) => to);
    expect(exactItems).toEqual(['/']);
  });
});

describe('shouldShowNavigation', () => {
  it.each(['/fotografar', '/revisar'])('hides the navigation on the focused flow %s', (pathname) => {
    expect(shouldShowNavigation(pathname)).toBe(false);
  });

  it.each(['/', '/calendario', '/historico', '/historico/abc-123', '/alergias', '/exportar', '/configuracoes', '/medicamento/novo'])(
    'shows the navigation on %s',
    (pathname) => {
      expect(shouldShowNavigation(pathname)).toBe(true);
    },
  );
});
