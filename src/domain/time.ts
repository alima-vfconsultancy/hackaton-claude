import { format, parse } from 'date-fns';

/** Calendar day in local time, formatted as `yyyy-MM-dd`. */
export type LocalDate = string;
/** Time of day in local time, formatted as `HH:mm`. */
export type LocalTime = string;
/** Instant expressed as milliseconds since the Unix epoch. */
export type EpochMs = number;

export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;

const LOCAL_DATE_FORMAT = 'yyyy-MM-dd';
const LOCAL_TIME_PATTERN = /^\d{1,2}:\d{2}$/;

/** Parses a `yyyy-MM-dd` string into a `Date` at local midnight. */
export const parseLocalDate = (value: LocalDate): Date => parse(value, LOCAL_DATE_FORMAT, new Date());

/** Formats a `Date` as a `yyyy-MM-dd` string (local time). */
export const formatLocalDate = (date: Date): LocalDate => format(date, LOCAL_DATE_FORMAT);

/** Tells whether the text looks like `H:mm` or `HH:mm`. */
export const isLocalTime = (value: string): boolean => LOCAL_TIME_PATTERN.test(value);

/** Zero-pads the hour so that `8:30` becomes `08:30`. */
export function padLocalTime(value: LocalTime): LocalTime {
  const [hours, minutes] = value.split(':');
  return `${hours.padStart(2, '0')}:${minutes}`;
}

/** Returns a copy of `day` with its clock set to `time` (seconds and ms zeroed). */
export function withLocalTime(day: Date, time: LocalTime): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(day);
  result.setHours(hours || 0, minutes || 0, 0, 0);
  return result;
}
