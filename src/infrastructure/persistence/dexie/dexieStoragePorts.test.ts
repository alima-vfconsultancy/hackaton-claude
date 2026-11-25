import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { buildDose, buildMedication } from '../../../application/testing/inMemoryPorts';
import { createMedicationService } from '../../../application/medicationService';
import { createSyncDoses } from '../../../application/syncDoses';
import { AppDatabase } from './database';
import { createDexieStoragePorts } from './dexieStoragePorts';

let counter = 0;
const opened: AppDatabase[] = [];
const setup = () => {
  const database = new AppDatabase(`test-db-${++counter}`);
  opened.push(database);
  return { database, ports: createDexieStoragePorts(database) };
};
afterEach(() => {
  for (const database of opened.splice(0)) database.close();
});

describe('medications', () => {
  it('stores nested schedule and period and finds them again', async () => {
    const { ports } = setup();
    await ports.medications.addMany([buildMedication(), buildMedication({ id: 'med-2', name: 'Losartana' })]);

    expect(await ports.medications.findById('med-1')).toEqual(buildMedication());
    expect((await ports.medications.list()).map((m) => m.id).sort()).toEqual(['med-1', 'med-2']);
  });

  it('removes a property when the patch sets it to undefined', async () => {
    const { ports } = setup();
    await ports.medications.addMany([buildMedication({ photoId: 'p1' })]);

    await ports.medications.update('med-1', { name: 'Novo', photoId: undefined });

    const stored = await ports.medications.findById('med-1');
    expect(stored?.name).toBe('Novo');
    expect(stored).not.toHaveProperty('photoId');
  });
});

describe('doses', () => {
  it('queries by day window, by medication (ordered) and by open status', async () => {
    const { ports } = setup();
    await ports.doses.addMany([
      buildDose({ id: 'c', scheduledAt: 30, status: 'taken' }),
      buildDose({ id: 'a', scheduledAt: 10 }),
      buildDose({ id: 'b', scheduledAt: 20, status: 'snoozed' }),
      buildDose({ id: 'x', scheduledAt: 15, medicationId: 'other' }),
    ]);

    expect((await ports.doses.listBetween(10, 20)).map((d) => d.id).sort()).toEqual(['a', 'b', 'x']);
    expect((await ports.doses.listByMedication('med-1')).map((d) => d.id)).toEqual(['a', 'b', 'c']);
    expect((await ports.doses.listOpen()).map((d) => d.id).sort()).toEqual(['a', 'b', 'x']);
  });

  it('refuses two doses of the same medication at the same time', async () => {
    const { ports } = setup();
    await ports.doses.addMany([buildDose({ id: 'a', scheduledAt: 10 })]);

    await expect(ports.doses.addMany([buildDose({ id: 'b', scheduledAt: 10 })])).rejects.toThrow();
  });

  it('removes by ids and by medication', async () => {
    const { ports } = setup();
    await ports.doses.addMany([
      buildDose({ id: 'a', scheduledAt: 1 }),
      buildDose({ id: 'b', scheduledAt: 2 }),
      buildDose({ id: 'c', scheduledAt: 3, medicationId: 'other' }),
    ]);

    await ports.doses.removeMany(['a']);
    await ports.doses.removeByMedication('other');

    expect((await ports.doses.listAll()).map((d) => d.id)).toEqual(['b']);
  });
});

describe('settings', () => {
  it('is undefined until saved and does not leak the storage key', async () => {
    const { ports } = setup();
    expect(await ports.settings.get()).toBeUndefined();

    await ports.settings.save({ notificationsEnabled: true, snoozeMinutes: 15, fontScale: 'large' });

    expect(await ports.settings.get()).toEqual({ notificationsEnabled: true, snoozeMinutes: 15, fontScale: 'large' });
  });
});

describe('transactions', () => {
  it('rolls back every write when the work fails', async () => {
    const { ports } = setup();

    await expect(
      ports.transactions.run(async () => {
        await ports.medications.addMany([buildMedication()]);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await ports.medications.list()).toEqual([]);
  });
});

describe('application on top of Dexie', () => {
  it('creates a medication with its doses and removes everything on delete', async () => {
    const { ports } = setup();
    const service = createMedicationService(ports, createSyncDoses(ports));
    const { period: _period, ...rest } = buildMedication();
    const today = new Date();
    const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const [id] = await service.create([{ ...rest, period: { startDate }, schedule: { type: 'fixedTimes', times: ['00:00', '23:59'] } }], 'data:image/jpeg;base64,xx');
    const detail = await service.getDetail(id);

    expect(detail?.medication.photoId).toBeDefined();
    expect(detail?.photo?.dataUrl).toBe('data:image/jpeg;base64,xx');
    expect(detail?.doses.length).toBeGreaterThan(0);

    await service.remove(id);
    expect(await ports.medications.list()).toEqual([]);
    expect(await ports.doses.listAll()).toEqual([]);
    expect(await ports.photos.listAll()).toEqual([]);
  });
});

describe('schema upgrade', () => {
  it('discards prototype (version 1) data instead of failing on its old shape', async () => {
    const name = `legacy-db-${++counter}`;
    const legacy = new Dexie(name);
    legacy.version(1).stores({
      medications: 'id, status, name, startDate, photoId',
      doseLogs: 'id, medicationId, scheduledAt, status, &[medicationId+scheduledAt]',
      settings: 'key',
      photos: 'id',
    });
    await legacy.table('medications').add({ id: 'old', name: 'Antigo', startDate: '2026-01-01', form: 'cápsula' });
    await legacy.table('settings').add({ key: 'app', fontScale: 'grande' });
    legacy.close();

    const { database } = (() => {
      const database = new AppDatabase(name);
      opened.push(database);
      return { database };
    })();

    expect(await database.medications.toArray()).toEqual([]);
    expect(await database.settings.toArray()).toEqual([]);
  });
});
