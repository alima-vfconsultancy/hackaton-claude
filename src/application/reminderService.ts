import { effectiveTime, MISSED_AFTER_MS } from '../domain/dose';
import type { DoseEntry } from './doseService';
import type { ReminderNotifier, StoragePorts } from './ports';
import type { SyncDoses } from './syncDoses';

/** A dose that is due now (its time has come and it is not yet overdue). */
export type DueDose = DoseEntry;

export interface ReminderService {
  /**
   * Refreshes the doses, returns the ones due right now and alerts once per dose
   * (beep + system notification when notifications are enabled).
   */
  check(options: { notificationsEnabled: boolean }): Promise<DueDose[]>;
}

/** Builds the reminder check, which alerts through the given notifier. */
export function createReminderService(ports: StoragePorts, notifier: ReminderNotifier, syncDoses: SyncDoses): ReminderService {
  const { medications, doses } = ports;

  return {
    async check({ notificationsEnabled }) {
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

      const fresh = due.filter(({ dose }) => !dose.notifiedAt);
      if (fresh.length) notifier.playAlert();
      for (const { dose, medication } of fresh) {
        if (notificationsEnabled) await notifier.showDoseReminder(dose, medication);
        await doses.update(dose.id, { notifiedAt: now });
      }
      return due;
    },
  };
}
