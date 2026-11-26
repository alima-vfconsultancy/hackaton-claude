import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDose, buildMedication, createInMemoryPorts, createRecordingNotifier } from './testing/inMemoryPorts';
import { DEFAULT_SETTINGS } from '../domain/settings';
import { createDoseService } from './doseService';
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
  const syncDoses = createSyncDoses(ports);
  const doseService = createDoseService(ports, syncDoses, notifier);
  return { ports, notifier, service: createReminderService(ports, notifier, syncDoses, doseService) };
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

  it('reports how many doses are due, for the counter on the tab and app icon', async () => {
    const { notifier, service } = setup([
      buildDose({ id: 'a', scheduledAt: NOW - 5 * MINUTE }),
      buildDose({ id: 'b', scheduledAt: NOW - 1 * MINUTE }),
      buildDose({ id: 'future', scheduledAt: NOW + 10 * MINUTE }),
    ]);

    await service.check({ notificationsEnabled: false });

    expect(notifier.pendingCounts).toEqual([2]);
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

describe('reminders.handleNotificationAction', () => {
  it('marks the dose as taken when the user taps "Tomei" on the notification', async () => {
    const { ports, notifier, service } = setup();

    expect(await service.handleNotificationAction('dose-1', 'take')).toBe(true);

    expect(ports.store.doses[0]).toMatchObject({ status: 'taken', takenAt: NOW });
    expect(notifier.dismissed).toEqual(['dose-1']);
  });

  it('snoozes the dose for the minutes chosen in the settings, so the reminder fires again', async () => {
    const { ports, service } = setup([buildDose({ scheduledAt: NOW - 5 * MINUTE, notifiedAt: NOW - 5 * MINUTE })]);
    await ports.settings.save({ ...DEFAULT_SETTINGS, snoozeMinutes: 15 });

    expect(await service.handleNotificationAction('dose-1', 'snooze')).toBe(true);

    expect(ports.store.doses[0]).toMatchObject({ status: 'snoozed', snoozedUntil: NOW + 15 * MINUTE });
    expect(ports.store.doses[0]).not.toHaveProperty('notifiedAt');
  });

  it('uses the default snooze time when the user never changed the settings', async () => {
    const { ports, service } = setup();

    await service.handleNotificationAction('dose-1', 'snooze');

    expect(ports.store.doses[0].snoozedUntil).toBe(NOW + DEFAULT_SETTINGS.snoozeMinutes * MINUTE);
  });

  it.each([
    ['taken', buildDose({ status: 'taken', takenAt: NOW - MINUTE }), 'taken'],
    ['skipped', buildDose({ status: 'skipped' }), 'skipped'],
    ['missed', buildDose({ status: 'missed' }), 'missed'],
    ['too late to register (it becomes missed)', buildDose({ scheduledAt: NOW - 3 * 60 * MINUTE }), 'missed'],
  ] as const)('changes nothing when the dose is %s', async (_, dose, expectedStatus) => {
    const { ports, service } = setup([dose]);

    expect(await service.handleNotificationAction('dose-1', 'snooze')).toBe(false);
    expect(await service.handleNotificationAction('dose-1', 'take')).toBe(false);

    expect(ports.store.doses[0].status).toBe(expectedStatus);
    expect(ports.store.doses[0].takenAt).toBe(dose.takenAt);
    expect(ports.store.doses[0]).not.toHaveProperty('snoozedUntil');
  });

  it('changes nothing when the dose no longer exists', async () => {
    const { ports, service } = setup();

    expect(await service.handleNotificationAction('gone', 'take')).toBe(false);

    expect(ports.store.doses[0].status).toBe('pending');
  });
});
