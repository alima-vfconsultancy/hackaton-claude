import { describe, expect, it } from 'vitest';
import { NAVIGATION_ITEMS, shouldShowNavigation } from './navigationItems';

describe('NAVIGATION_ITEMS', () => {
  it('lists the five main areas in reading order', () => {
    expect(NAVIGATION_ITEMS.map(({ to }) => to)).toEqual([
      '/',
      '/calendario',
      '/historico',
      '/exportar',
      '/configuracoes',
    ]);
    expect(NAVIGATION_ITEMS.map(({ label }) => label)).toEqual([
      'Hoje',
      'Calendário',
      'Histórico',
      'Exportar',
      'Ajustes',
    ]);
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

  it.each(['/', '/calendario', '/historico', '/historico/abc-123', '/exportar', '/configuracoes', '/medicamento/novo'])(
    'shows the navigation on %s',
    (pathname) => {
      expect(shouldShowNavigation(pathname)).toBe(true);
    },
  );
});
