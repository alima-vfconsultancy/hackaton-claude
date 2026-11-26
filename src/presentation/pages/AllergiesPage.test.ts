import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Vitest runs in Node without a DOM, so (like SettingsPage.test.ts) this checks the sources. */
const pagePath = resolve(__dirname, 'AllergiesPage.tsx');
const appSource = readFileSync(resolve(__dirname, '../../App.tsx'), 'utf-8');

describe('AllergiesPage', () => {
  it('exists as its own page', () => {
    expect(existsSync(pagePath)).toBe(true);
  });

  it('has the "Alergias" title and reuses the allergy registry section', () => {
    const source = readFileSync(pagePath, 'utf-8');
    expect(source).toContain('title="Alergias"');
    expect(source).toContain('<AllergySection');
  });

  it('is reachable at /alergias', () => {
    expect(appSource).toContain('path="/alergias" element={<AllergiesPage />}');
  });
});
