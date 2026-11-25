import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDose, buildMedication, createInMemoryPorts, createRecordingNotifier } from './testing/inMemoryPorts';
import { createReminderService } from './reminderService';
import { createSyncDoses } from './syncDoses';

const NOW = new Date(2026, 2, 10, 12, 0).getTime();
const MINUTE = 60_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

const setup = (doses = [buildDose({ scheduledAt: NOW - 5 * MINUTE })]) => {
  // A paused medication keeps the sync from creating extra doses.
  const ports = createInMemoryPorts({ medications: [buildMedication({ status: 'paused' })], doses });
  const notifier = createRecordingNotifier();
  return { ports, notifier, service: createReminderService(ports, notifier, createSyncDoses(ports)) };
};

describe('reminders.check', () => {
  it('returns the dose that is due and alerts once', async () => {
    const { ports, notifier, service } = setup();

    const first = await service.check({ notificationsEnabled: true });
    const second = await service.check({ notificationsEnabled: true });

    expect(first.map((entry) => entry.dose.id)).toEqual(['dose-1']);
    expect(second.map((entry) => entry.dose.id)).toEqual(['dose-1']);
    expect(notifier.shown).toHaveLength(1);
    expect(notifier.alerts).toBe(1);
    expect(ports.store.doses[0].notifiedAt).toBe(NOW);
  });

  it('beeps but shows no system notification when notifications are disabled', async () => {
    const { notifier, service } = setup();

    await service.check({ notificationsEnabled: false });

    expect(notifier.alerts).toBe(1);
    expect(notifier.shown).toEqual([]);
  });

  it('ignores doses in the future and doses too late to alert', async () => {
    const { service } = setup([
      buildDose({ id: 'future', scheduledAt: NOW + 10 * MINUTE }),
      buildDose({ id: 'too-late', scheduledAt: NOW - 3 * 60 * MINUTE }),
    ]);

    expect(await service.check({ notificationsEnabled: true })).toEqual([]);
  });

  it('uses the snooze time to decide whether a dose is due', async () => {
    const { service } = setup([
      buildDose({ status: 'snoozed', scheduledAt: NOW - 60 * MINUTE, snoozedUntil: NOW + 10 * MINUTE }),
    ]);

    expect(await service.check({ notificationsEnabled: true })).toEqual([]);
  });
});
