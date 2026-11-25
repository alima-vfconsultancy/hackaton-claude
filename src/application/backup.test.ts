import { describe, expect, it } from 'vitest';
import { BackupError, type BackupErrorCode } from './errors';
import { buildDose, buildMedication, createInMemoryPorts } from './testing/inMemoryPorts';
import { BACKUP_VERSION, createBackupService, parseBackup } from './backup';

const valid = {
  app: 'meu-remedio',
  version: BACKUP_VERSION,
  exportedAt: '2026-03-10T10:00:00Z',
  medications: [buildMedication()],
  doseLogs: [buildDose()],
};

const codeOf = (text: string): BackupErrorCode | undefined => {
  try {
    parseBackup(text);
  } catch (error) {
    return (error as BackupError).code;
  }
  return undefined;
};

describe('parseBackup', () => {
  it('accepts a valid backup and fills in the optional parts', () => {
    const backup = parseBackup(JSON.stringify(valid));
    expect(backup.medications).toHaveLength(1);
    expect(backup.photos).toEqual([]);
    expect(backup.settings).toBeNull();
  });

  it('rejects text that is not JSON', () => {
    expect(codeOf('oi')).toBe('not_json');
  });

  it('rejects JSON from another app', () => {
    expect(codeOf('{"a":1}')).toBe('not_a_backup');
  });

  it('rejects backups written with another data version', () => {
    expect(codeOf(JSON.stringify({ ...valid, version: 1 }))).toBe('unsupported_version');
  });

  it('rejects incomplete backups', () => {
    expect(codeOf(JSON.stringify({ ...valid, doseLogs: undefined }))).toBe('incomplete');
  });

  it('rejects medications and doses with the wrong shape', () => {
    expect(codeOf(JSON.stringify({ ...valid, medications: [{ id: 1 }] }))).toBe('invalid_data');
    expect(codeOf(JSON.stringify({ ...valid, medications: [{ id: 'a', name: 'X', period: {}, schedule: {} }] }))).toBe('invalid_data');
    expect(codeOf(JSON.stringify({ ...valid, doseLogs: [{ id: 'd' }] }))).toBe('invalid_data');
  });
});

describe('BackupService', () => {
  it('exports everything and restores it over existing data', async () => {
    const source = createInMemoryPorts({
      medications: [buildMedication()],
      doses: [buildDose()],
      photos: [{ id: 'p1', dataUrl: 'x', createdAt: 0 }],
      settings: { notificationsEnabled: true, snoozeMinutes: 15, fontScale: 'large' },
    });
    const backup = parseBackup(JSON.stringify(await createBackupService(source).build()));

    const target = createInMemoryPorts({ medications: [buildMedication({ id: 'old' })] });
    await createBackupService(target).restore(backup);

    expect(target.store.medications.map((m) => m.id)).toEqual(['med-1']);
    expect(target.store.doses).toHaveLength(1);
    expect(target.store.photos).toHaveLength(1);
    expect(target.store.settings).toEqual({ notificationsEnabled: true, snoozeMinutes: 15, fontScale: 'large' });
  });

  it('wipes every table', async () => {
    const ports = createInMemoryPorts({
      medications: [buildMedication()],
      doses: [buildDose()],
      photos: [{ id: 'p1', dataUrl: 'x', createdAt: 0 }],
      settings: { notificationsEnabled: true, snoozeMinutes: 15, fontScale: 'large' },
    });

    await createBackupService(ports).wipeAll();

    expect(ports.store).toEqual({ medications: [], doses: [], photos: [], settings: undefined });
  });
});
