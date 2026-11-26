import { effectiveTime, MISSED_AFTER_MS } from '../domain/dose';
import { DEFAULT_SETTINGS } from '../domain/settings';
import type { DoseEntry, DoseService } from './doseService';
import type { ReminderNotifier, StoragePorts } from './ports';
import type { SyncDoses } from './syncDoses';

/** A dose that is due now (its time has come and it is not yet overdue). */
export type DueDose = DoseEntry;

/** Buttons on the reminder notification: "Tomei" and "Adiar". */
export type ReminderAction = 'take' | 'snooze';

/**
 * Type of the message a notification click sends to the app window:
 * `{ type, doseId, action: 'take' | 'snooze' | '' }` ('' = the notification itself was tapped).
 * Also hard-coded in `public/sw-notifications.js`, which cannot import modules.
 */
export const REMINDER_CLICK_MESSAGE = 'reminder-click';

export interface ReminderService {
  /**
   * Refreshes the doses, returns the ones due right now and alerts once per dose
   * (beep + system notification when notifications are enabled).
   */
  check(options: { notificationsEnabled: boolean }): Promise<DueDose[]>;
  /**
   * Applies the button the user tapped on a dose notification: "take" marks it as taken,
   * "snooze" postpones it by the minutes in the settings. Only doses still waiting
   * (pending or snoozed, not yet missed) change.
   *
   * @returns whether the dose was changed
   */
  handleNotificationAction(doseId: string, action: ReminderAction): Promise<boolean>;
}

/** Builds the reminder use cases, which alert through the given notifier and register doses through `doseService`. */
export function createReminderService(
  ports: StoragePorts,
  notifier: ReminderNotifier,
  syncDoses: SyncDoses,
  doseService: DoseService,
): ReminderService {
  const { medications, doses, settings } = ports;
  /** Check in progress: overlapping calls share it, so a dose is never alerted twice. */
  let running: Promise<DueDose[]> | null = null;

  const runCheck = async (notificationsEnabled: boolean): Promise<DueDose[]> => {
    await syncDoses();
    const now = Date.now();
    const [open, allMedications] = await Promise.all([doses.listOpen(), medications.list()]);
    const byId = new Map(allMedications.map((medication) => [medication.id, medication]));

    const due: DueDose[] = open
      .filter((dose) => {
        const delay = now - effectiveTime(dose);
        return delay >= 0 && delay <= MISSED_AFTER_MS && byId.has(dose.medicationId);
      })
      .sort((a, b) => effectiveTime(a) - effectiveTime(b))
      .map((dose) => ({ dose, medication: byId.get(dose.medicationId)! }));
    notifier.showPendingCount(due.length);

    const fresh = due.filter(({ dose }) => !dose.notifiedAt);
    if (fresh.length) notifier.playAlert();
    for (const { dose, medication } of fresh) {
      if (notificationsEnabled) await notifier.showDoseReminder(dose, medication);
      await doses.update(dose.id, { notifiedAt: now });
    }
    return due;
  };

  return {
    check({ notificationsEnabled }) {
      running ??= runCheck(notificationsEnabled).finally(() => {
        running = null;
      });
      return running;
    },

    async handleNotificationAction(doseId, action) {
      // Sync first, so a dose that became "missed" while the app was closed is not registered late.
      await syncDoses();
      const dose = (await doses.listOpen()).find((open) => open.id === doseId);
      if (!dose) return false;
      if (action === 'take') {
        await doseService.mark(doseId, 'taken');
      } else {
        const { snoozeMinutes } = (await settings.get()) ?? DEFAULT_SETTINGS;
        await doseService.snooze(doseId, snoozeMinutes);
      }
      return true;
    },
  };
}
