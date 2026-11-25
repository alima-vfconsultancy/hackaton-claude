import { endOfDay } from 'date-fns';
import type { DoseLog } from './dose';
import type { Medication } from './medication';
import { parseLocalDate, type EpochMs, type LocalDate } from './time';

export interface Adherence {
  taken: number;
  skipped: number;
  missed: number;
  /** Doses planned so far (their time has already passed). */
  expected: number;
  /** 0..100, or `null` while there are no planned doses yet. */
  percentage: number | null;
}

/** Share of planned doses (up to `now`) that were actually taken. */
export function computeAdherence(doses: Pick<DoseLog, 'status' | 'scheduledAt'>[], now: EpochMs = Date.now()): Adherence {
  const past = doses.filter((dose) => dose.scheduledAt <= now);
  const taken = past.filter((dose) => dose.status === 'taken').length;
  const skipped = past.filter((dose) => dose.status === 'skipped').length;
  const missed = past.filter((dose) => dose.status === 'missed').length;
  const expected = past.length;
  return { taken, skipped, missed, expected, percentage: expected ? Math.round((taken / expected) * 100) : null };
}

export type TreatmentFilter = 'current' | 'past' | 'all';

/** Does the treatment overlap the period `[from, to]`? Open bounds are ignored. */
export function overlapsPeriod(
  medication: Pick<Medication, 'period'>,
  from?: LocalDate,
  to?: LocalDate,
): boolean {
  const { startDate, endDate } = medication.period;
  if (to && parseLocalDate(startDate) > endOfDay(parseLocalDate(to))) return false;
  if (from && endDate && endOfDay(parseLocalDate(endDate)) < parseLocalDate(from)) return false;
  return true;
}

/** `current` keeps active and paused treatments, `past` keeps finished ones. */
export function matchesTreatmentFilter(medication: Pick<Medication, 'status'>, filter: TreatmentFilter): boolean {
  if (filter === 'all') return true;
  return filter === 'past' ? medication.status === 'finished' : medication.status !== 'finished';
}
