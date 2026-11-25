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
  ])('keeps the "%s" section', (text) => {
    expect(source).toContain(text);
  });
});
