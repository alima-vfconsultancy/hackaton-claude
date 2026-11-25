import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { format } from 'date-fns';
import { buildMedication, createInMemoryPorts } from './testing/inMemoryPorts';
import { createSyncDoses } from './syncDoses';

const NOW = new Date(2026, 2, 10, 12, 0).getTime();
const label = (timestamp: number) => format(new Date(timestamp), 'dd/MM HH:mm');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe('syncDoses', () => {
  it('creates the planned doses up to the end of today without duplicating them', async () => {
    const ports = createInMemoryPorts({ medications: [buildMedication()] });
    const syncDoses = createSyncDoses(ports);

    await syncDoses(NOW);
    await syncDoses(NOW);

    expect(ports.store.doses.map((d) => label(d.scheduledAt))).toEqual(['10/03 08:00', '10/03 16:00']);
  });

  it('marks open doses more than 2h overdue as missed and reports how many', async () => {
    const ports = createInMemoryPorts({ medications: [buildMedication()] });
    const syncDoses = createSyncDoses(ports);

    expect(await syncDoses(NOW)).toEqual({ newlyMissed: 1 });
    expect(ports.store.doses.map((d) => d.status)).toEqual(['missed', 'pending']);
    expect(await syncDoses(NOW)).toEqual({ newlyMissed: 0 });
  });

  it('does not create doses before the tracking start (no fake missed backlog)', async () => {
    const medication = buildMedication({ dosesTrackedFrom: NOW - 2 * 3_600_000 });
    const ports = createInMemoryPorts({ medications: [medication] });

    await createSyncDoses(ports)(NOW);

    expect(ports.store.doses.map((d) => label(d.scheduledAt))).toEqual(['10/03 16:00']);
  });

  it('finishes active treatments whose end date has passed and creates no doses for them', async () => {
    const medication = buildMedication({ period: { startDate: '2026-03-01', endDate: '2026-03-09' } });
    const ports = createInMemoryPorts({ medications: [medication] });

    await createSyncDoses(ports)(NOW);

    expect(ports.store.medications[0].status).toBe('finished');
    expect(ports.store.doses).toEqual([]);
  });

  it('keeps paused treatments untouched', async () => {
    const ports = createInMemoryPorts({ medications: [buildMedication({ status: 'paused' })] });

    await createSyncDoses(ports)(NOW);

    expect(ports.store.doses).toEqual([]);
  });
});
