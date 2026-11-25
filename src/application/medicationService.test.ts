import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyMedicationDraft, type MedicationDraft } from '../domain/medication';
import { buildDose, buildMedication, createInMemoryPorts } from './testing/inMemoryPorts';
import { createMedicationService } from './medicationService';
import { createSyncDoses } from './syncDoses';

const NOW = new Date(2026, 2, 10, 12, 0).getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

const setup = (initial = {}) => {
  const ports = createInMemoryPorts(initial);
  return { ports, service: createMedicationService(ports, createSyncDoses(ports)) };
};

const draft = (overrides: Partial<MedicationDraft> = {}): MedicationDraft => ({
  ...createEmptyMedicationDraft(new Date(NOW)),
  name: '  Amoxicilina ',
  schedule: { type: 'interval', intervalHours: 8, firstDoseTime: '08:00' },
  ...overrides,
});

describe('create', () => {
  it('stores trimmed medications that track doses from 2 hours ago and generates their doses', async () => {
    const { ports, service } = setup();

    const [id] = await service.create([draft()]);

    expect(ports.store.medications).toHaveLength(1);
    expect(ports.store.medications[0]).toMatchObject({ id, name: 'Amoxicilina', dosesTrackedFrom: NOW - 2 * 3_600_000 });
    expect(ports.store.doses).toHaveLength(1);
  });

  it('links the stored prescription photo to every created medication', async () => {
    const { ports, service } = setup();

    await service.create([draft({ name: 'A' }), draft({ name: 'B' })], 'data:image/jpeg;base64,xx');

    expect(ports.store.photos).toHaveLength(1);
    expect(ports.store.medications.map((m) => m.photoId)).toEqual([ports.store.photos[0].id, ports.store.photos[0].id]);
  });

  it('does not store a photo unless one is provided', async () => {
    const { ports, service } = setup();
    await service.create([draft()]);
    expect(ports.store.photos).toEqual([]);
    expect(ports.store.medications[0]).not.toHaveProperty('photoId');
  });
});

describe('update', () => {
  it('rebuilds open doses but keeps resolved ones in the history', async () => {
    const { ports, service } = setup({
      medications: [buildMedication()],
      doses: [
        buildDose({ id: 'taken', status: 'taken', scheduledAt: NOW - 5 * 3_600_000 }),
        buildDose({ id: 'open', status: 'pending', scheduledAt: NOW + 3_600_000 }),
      ],
    });

    await service.update('med-1', draft({ name: 'Amoxicilina 2' }));

    const ids = ports.store.doses.map((d) => d.id);
    expect(ids).toContain('taken');
    expect(ids).not.toContain('open');
    expect(ports.store.medications[0].name).toBe('Amoxicilina 2');
  });
});

describe('setStatus', () => {
  it('removes open doses when pausing', async () => {
    const { ports, service } = setup({ medications: [buildMedication()], doses: [buildDose()] });

    await service.setStatus('med-1', 'paused');

    expect(ports.store.medications[0].status).toBe('paused');
    expect(ports.store.doses).toEqual([]);
  });

  it('generates doses again from now when resuming', async () => {
    const { ports, service } = setup({ medications: [buildMedication({ status: 'paused', dosesTrackedFrom: 0 })] });

    await service.setStatus('med-1', 'active');

    expect(ports.store.medications[0]).toMatchObject({ status: 'active', dosesTrackedFrom: NOW - 2 * 3_600_000 });
    expect(ports.store.doses).toHaveLength(1);
  });
});

describe('remove', () => {
  it('deletes the medication, its doses and its now-unused photo', async () => {
    const { ports, service } = setup({
      medications: [buildMedication({ photoId: 'p1' })],
      doses: [buildDose()],
      photos: [{ id: 'p1', dataUrl: 'x', createdAt: 0 }],
    });

    await service.remove('med-1');

    expect(ports.store).toMatchObject({ medications: [], doses: [], photos: [] });
  });

  it('keeps a photo that another medication still uses', async () => {
    const { ports, service } = setup({
      medications: [buildMedication({ photoId: 'p1' }), buildMedication({ id: 'med-2', photoId: 'p1' })],
      photos: [{ id: 'p1', dataUrl: 'x', createdAt: 0 }],
    });

    await service.remove('med-1');

    expect(ports.store.photos).toHaveLength(1);
  });
});

describe('getDetail', () => {
  it('returns the medication with its ordered doses and photo', async () => {
    const { service } = setup({
      medications: [buildMedication({ photoId: 'p1' })],
      doses: [buildDose({ id: 'b', scheduledAt: 2 }), buildDose({ id: 'a', scheduledAt: 1 })],
      photos: [{ id: 'p1', dataUrl: 'x', createdAt: 0 }],
    });

    const detail = await service.getDetail('med-1');

    expect(detail?.doses.map((d) => d.id)).toEqual(['a', 'b']);
    expect(detail?.photo?.id).toBe('p1');
  });

  it('is undefined for an unknown medication', async () => {
    const { service } = setup();
    expect(await service.getDetail('nope')).toBeUndefined();
  });
});
