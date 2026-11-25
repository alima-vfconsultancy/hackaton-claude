import { addDays, endOfDay, format, startOfDay } from 'date-fns';
import type { Medication, Schedule, TreatmentPeriod } from './medication';
import {
  formatLocalDate, HOUR_MS, isLocalTime, padLocalTime, parseLocalDate, withLocalTime,
  type EpochMs, type LocalDate, type LocalTime,
} from './time';

/** The part of a medication that determines when doses happen. */
export type Treatment = Pick<Medication, 'schedule' | 'period'>;

/** Last day of a treatment that lasts `durationDays` days (the end date is inclusive). */
export function computeEndDate(startDate: LocalDate, durationDays: number): LocalDate {
  return formatLocalDate(addDays(parseLocalDate(startDate), durationDays - 1));
}

/** End of the last treatment day, or `null` for continuous treatments. */
export function treatmentEnd(period: TreatmentPeriod): Date | null {
  return period.endDate ? endOfDay(parseLocalDate(period.endDate)) : null;
}

/** Valid, de-duplicated and sorted `HH:mm` entries of a fixed-times schedule. */
function cleanFixedTimes(times: LocalTime[]): LocalTime[] {
  return [...new Set(times)].filter(isLocalTime).sort();
}

/**
 * Lists the planned dose instants inside `[from, to]`, bounded by the treatment period.
 * Interval schedules keep their grid across midnight (8h from 08:00 gives 08:00, 16:00, 00:00...).
 */
export function generateDoseTimes({ schedule, period }: Treatment, from: Date, to: Date): EpochMs[] {
  const end = treatmentEnd(period);
  const limit = end && end < to ? end : to;
  const result: EpochMs[] = [];
  const start = parseLocalDate(period.startDate);

  if (schedule.type === 'interval') {
    if (!(schedule.intervalHours > 0)) return result;
    const step = schedule.intervalHours * HOUR_MS;
    const first = withLocalTime(start, schedule.firstDoseTime || '08:00').getTime();
    const firstIndex = Math.max(0, Math.ceil((from.getTime() - first) / step));
    for (let instant = first + firstIndex * step; instant <= limit.getTime(); instant += step) result.push(instant);
    return result;
  }

  const times = cleanFixedTimes(schedule.times);
  if (times.length === 0) return result;
  let day = startOfDay(from) > start ? startOfDay(from) : start;
  while (day <= limit) {
    for (const time of times) {
      const instant = withLocalTime(day, time).getTime();
      if (instant >= from.getTime() && instant <= limit.getTime()) result.push(instant);
    }
    day = addDays(day, 1);
  }
  return result;
}

/** The `HH:mm` times the user will see on the first day (within 24h for interval schedules). */
export function previewTimes(schedule: Schedule): LocalTime[] {
  if (schedule.type === 'fixedTimes') return cleanFixedTimes(schedule.times).map(padLocalTime).sort();

  const { intervalHours, firstDoseTime } = schedule;
  if (!(intervalHours > 0) || !firstDoseTime) return [];
  const base = withLocalTime(new Date(2000, 0, 1), firstDoseTime).getTime();
  const result: LocalTime[] = [];
  for (let k = 0; k * intervalHours < 24 && result.length < 24; k++) {
    result.push(format(new Date(base + k * intervalHours * HOUR_MS), 'HH:mm'));
  }
  return result;
}

/** True when the interval divides the day evenly (so every day has the same times). */
export const intervalDividesDay = (intervalHours: number): boolean => intervalHours > 0 && 24 % intervalHours === 0;
