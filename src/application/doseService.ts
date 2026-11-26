import { endOfDay, startOfDay } from 'date-fns';
import { effectiveTime, type DoseLog } from '../domain/dose';
import type { Medication } from '../domain/medication';
import { MINUTE_MS } from '../domain/time';
import type { ReminderNotifier, StoragePorts } from './ports';
import type { SyncDoses } from './syncDoses';

export interface DoseEntry {
  dose: DoseLog;
  medication: Medication;
}

export interface TodayOverview {
  /** Today's doses (only those whose medication still exists), ordered by effective time. */
  entries: DoseEntry[];
  activeMedicationCount: number;
}

export interface DoseService {
  getToday(now: Date): Promise<TodayOverview>;
  mark(id: string, status: 'taken' | 'skipped'): Promise<void>;
  /** Postpones the dose and allows its reminder to fire again. */
  snooze(id: string, minutes: number): Promise<void>;
  /** Puts a taken/skipped/missed dose back to pending. */
  undo(id: string): Promise<void>;
}

/**
 * Builds the use cases that read and change the dose log; `syncDoses` keeps doses consistent after an undo
 * and `notifier` closes the reminder of a dose once it is registered.
 */
export function createDoseService(ports: StoragePorts, syncDoses: SyncDoses, notifier: ReminderNotifier): DoseService {
  const { medications, doses } = ports;

  return {
    async getToday(now) {
      const [todayDoses, allMedications] = await Promise.all([
        doses.listBetween(startOfDay(now).getTime(), endOfDay(now).getTime()),
        medications.list(),
      ]);
      const byId = new Map(allMedications.map((medication) => [medication.id, medication]));
      const entries = todayDoses
        .filter((dose) => byId.has(dose.medicationId))
        .map((dose) => ({ dose, medication: byId.get(dose.medicationId)! }))
        .sort((a, b) => effectiveTime(a.dose) - effectiveTime(b.dose));
      return { entries, activeMedicationCount: allMedications.filter((m) => m.status === 'active').length };
    },

    async mark(id, status) {
      await doses.update(id, { status, takenAt: status === 'taken' ? Date.now() : undefined, snoozedUntil: undefined });
      await notifier.dismissDoseReminder(id);
    },

    async snooze(id, minutes) {
      await doses.update(id, { status: 'snoozed', snoozedUntil: Date.now() + minutes * MINUTE_MS, notifiedAt: undefined });
      await notifier.dismissDoseReminder(id);
    },

    async undo(id) {
      await doses.update(id, { status: 'pending', takenAt: undefined, snoozedUntil: undefined, notifiedAt: undefined });
      await syncDoses();
    },
  };
}
