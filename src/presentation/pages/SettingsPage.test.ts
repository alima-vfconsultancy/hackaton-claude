import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Vitest runs in Node without a DOM, so (like src/architecture.test.ts) this checks the page source.
 * The settings page of the POC offers no backup, demo data or "erase everything" option.
 */
const source = readFileSync(resolve(__dirname, 'SettingsPage.tsx'), 'utf-8');

describe('SettingsPage', () => {
  it.each([
    'Backup dos dados',
    'Exportar backup',
    'Importar backup',
    'Demonstração',
    'Carregar exemplo',
    'Apagar todos os dados',
  ])('does not offer "%s"', (text) => {
    expect(source).not.toContain(text);
  });

  it.each(['app.backup', 'app.sampleData', 'SAMPLE_DATA_ENABLED', 'ConfirmDialog'])('does not use %s', (code) => {
    expect(source).not.toContain(code);
  });

  it.each([
    'Notificações',
    'Adiar por quantos minutos?',
    'Tamanho da letra',
    'Instalar na tela inicial',
    'Exportar PDF',
  ])('keeps the "%s" section', (text) => {
    expect(source).toContain(text);
  });

  it('no longer hosts the allergy registry (it has its own tab)', () => {
    expect(source).not.toContain('AllergySection');
  });

  it('links to the PDF export screen', () => {
    expect(source).toContain('to="/exportar"');
  });
});

describe('ExportPage', () => {
  it('goes back to Ajustes, where it is now opened from', () => {
    const exportSource = readFileSync(resolve(__dirname, 'ExportPage.tsx'), 'utf-8');
    expect(exportSource).toContain('back="/configuracoes"');
  });
});
