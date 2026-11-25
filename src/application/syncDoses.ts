import { endOfDay, isBefore, startOfDay } from 'date-fns';
import { isMissed, type DoseLog } from '../domain/dose';
import { generateDoseTimes } from '../domain/schedule';
import { parseLocalDate, type EpochMs } from '../domain/time';
import type { StoragePorts } from './ports';

export interface SyncSummary {
  newlyMissed: number;
}

export type SyncDoses = (now?: EpochMs) => Promise<SyncSummary>;

/**
 * Builds the routine that keeps stored doses consistent with the clock:
 * 1. finishes active treatments whose end date is in the past;
 * 2. creates the planned (pending) doses up to the end of today;
 * 3. marks as "missed" every open dose more than 2h overdue.
 */
export function createSyncDoses(ports: StoragePorts): SyncDoses {
  const { transactions, medications, doses, ids } = ports;

  return async (now = Date.now()) => {
    const nowDate = new Date(now);
    const today = startOfDay(nowDate);
    let newlyMissed = 0;

    await transactions.run(async () => {
      for (const medication of await medications.list()) {
        let { status } = medication;
        const { endDate, startDate } = medication.period;
        if (status === 'active' && endDate && isBefore(parseLocalDate(endDate), today)) {
          status = 'finished';
          await medications.update(medication.id, { status, updatedAt: now });
        }
        if (status !== 'active') continue;

        const from = new Date(Math.max(medication.dosesTrackedFrom, parseLocalDate(startDate).getTime()));
        const planned = generateDoseTimes(medication, from, endOfDay(nowDate));
        if (planned.length === 0) continue;

        const known = new Set((await doses.listByMedication(medication.id)).map((dose) => dose.scheduledAt));
        const fresh: DoseLog[] = planned
          .filter((scheduledAt) => !known.has(scheduledAt))
          .map((scheduledAt) => ({ id: ids.next(), medicationId: medication.id, scheduledAt, status: 'pending' }));
        if (fresh.length) await doses.addMany(fresh);
      }

      for (const dose of await doses.listOpen()) {
        if (isMissed(dose, now)) {
          await doses.update(dose.id, { status: 'missed' });
          newlyMissed++;
        }
      }
    });

    return { newlyMissed };
  };
}
