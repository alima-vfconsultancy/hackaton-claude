import { describe, expect, it } from 'vitest';
import { parseBackup } from './backup';

const valid = {
  app: 'meu-remedio', version: 1, exportedAt: '2026-03-10T10:00:00Z',
  medications: [{ id: 'a', name: 'X', startDate: '2026-03-10' }],
  doseLogs: [{ id: 'd', medicationId: 'a', scheduledAt: 1 }],
};

describe('parseBackup', () => {
  it('aceita um backup válido', () => {
    const b = parseBackup(JSON.stringify(valid));
    expect(b.medications).toHaveLength(1);
    expect(b.photos).toEqual([]);
    expect(b.settings).toBeNull();
  });
  it('recusa texto que não é JSON', () => {
    expect(() => parseBackup('oi')).toThrow(/não é um backup válido/);
  });
  it('recusa JSON de outro app', () => {
    expect(() => parseBackup('{"a":1}')).toThrow(/não é um backup do MeuRemédio/);
  });
  it('recusa backup incompleto ou com dados inválidos', () => {
    expect(() => parseBackup(JSON.stringify({ ...valid, doseLogs: undefined }))).toThrow(/incompleto/);
    expect(() => parseBackup(JSON.stringify({ ...valid, medications: [{ id: 1 }] }))).toThrow(/inválidos/);
  });
});
