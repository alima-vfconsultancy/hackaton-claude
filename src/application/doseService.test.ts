import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDose, buildMedication, createInMemoryPorts } from './testing/inMemoryPorts';
import { createDoseService } from './doseService';
import { createSyncDoses } from './syncDoses';

const NOW = new Date(2026, 2, 10, 12, 0).getTime();
const at = (hour: number, day = 10) => new Date(2026, 2, day, hour).getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

const setup = (initial = {}) => {
  const ports = createInMemoryPorts(initial);
  return { ports, service: createDoseService(ports, createSyncDoses(ports)) };
};

describe('getToday', () => {
  it("lists today's doses ordered by effective time, ignoring orphans and other days", async () => {
    const { service } = setup({
      medications: [buildMedication(), buildMedication({ id: 'med-2', status: 'paused' })],
      doses: [
        buildDose({ id: 'late', scheduledAt: at(20) }),
        buildDose({ id: 'snoozed', status: 'snoozed', scheduledAt: at(8), snoozedUntil: at(21) }),
        buildDose({ id: 'early', scheduledAt: at(9), medicationId: 'med-2' }),
        buildDose({ id: 'orphan', scheduledAt: at(10), medicationId: 'gone' }),
        buildDose({ id: 'tomorrow', scheduledAt: at(8, 11) }),
      ],
    });

    const today = await service.getToday(new Date(NOW));

    expect(today.entries.map((entry) => entry.dose.id)).toEqual(['early', 'late', 'snoozed']);
    expect(today.activeMedicationCount).toBe(1);
  });
});

describe('mark, snooze and undo', () => {
  it('records the moment a dose was taken, and nothing when it was skipped', async () => {
    const { ports, service } = setup({ doses: [buildDose({ id: 'a' }), buildDose({ id: 'b' })] });

    await service.mark('a', 'taken');
    await service.mark('b', 'skipped');

    expect(ports.store.doses[0]).toMatchObject({ status: 'taken', takenAt: NOW });
    expect(ports.store.doses[1]).toMatchObject({ status: 'skipped' });
    expect(ports.store.doses[1]).not.toHaveProperty('takenAt');
  });

  it('snoozes the dose for the given minutes and re-enables its reminder', async () => {
    const { ports, service } = setup({ doses: [buildDose({ notifiedAt: 1 })] });

    await service.snooze('dose-1', 10);

    expect(ports.store.doses[0]).toMatchObject({ status: 'snoozed', snoozedUntil: NOW + 600_000 });
    expect(ports.store.doses[0]).not.toHaveProperty('notifiedAt');
  });

  it('puts a resolved dose back to pending', async () => {
    const { ports, service } = setup({ doses: [buildDose({ status: 'taken', takenAt: NOW, scheduledAt: at(23) })] });

    await service.undo('dose-1');

    expect(ports.store.doses[0]).toMatchObject({ status: 'pending' });
    expect(ports.store.doses[0]).not.toHaveProperty('takenAt');
  });
});
