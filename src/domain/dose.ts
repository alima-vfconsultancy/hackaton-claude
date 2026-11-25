import { HOUR_MS, type EpochMs } from './time';

export type DoseStatus = 'pending' | 'taken' | 'skipped' | 'missed' | 'snoozed';

/** One scheduled intake of a medication and what happened to it. */
export interface DoseLog {
  id: string;
  medicationId: string;
  scheduledAt: EpochMs;
  status: DoseStatus;
  takenAt?: EpochMs;
  snoozedUntil?: EpochMs;
  /** Set once the reminder was shown, so it is not repeated. */
  notifiedAt?: EpochMs;
}

/** A pending/snoozed dose older than this becomes "missed". */
export const MISSED_AFTER_MS = 2 * HOUR_MS;

/** A dose that is still waiting for the user: pending or snoozed. */
export const isOpen = (dose: Pick<DoseLog, 'status'>): boolean => dose.status === 'pending' || dose.status === 'snoozed';

/** Moment used to display/alert a dose (a snooze moves it forward). */
export const effectiveTime = (dose: Pick<DoseLog, 'scheduledAt' | 'snoozedUntil' | 'status'>): EpochMs =>
  dose.status === 'snoozed' && dose.snoozedUntil ? dose.snoozedUntil : dose.scheduledAt;

/** Open doses more than 2h overdue (counted from the snooze, when there is one) are "missed". */
export function isMissed(dose: Pick<DoseLog, 'status' | 'scheduledAt' | 'snoozedUntil'>, now: EpochMs): boolean {
  if (!isOpen(dose)) return false;
  const reference = dose.snoozedUntil ?? dose.scheduledAt;
  return now - reference > MISSED_AFTER_MS;
}
