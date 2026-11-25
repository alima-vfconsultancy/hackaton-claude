import type { DoseLog, Medication } from '../types';
import { endOfDay } from 'date-fns';
import { parseDate } from './schedule';

export interface Adherence {
  taken: number;
  skipped: number;
  missed: number;
  /** Doses previstas até agora (horário já passou). */
  expected: number;
  /** 0..100, ou null se ainda não há doses previstas. */
  pct: number | null;
}

export function computeAdherence(doses: Pick<DoseLog, 'status' | 'scheduledAt'>[], now = Date.now()): Adherence {
  const past = doses.filter((d) => d.scheduledAt <= now);
  const taken = past.filter((d) => d.status === 'taken').length;
  const skipped = past.filter((d) => d.status === 'skipped').length;
  const missed = past.filter((d) => d.status === 'missed').length;
  const expected = past.length;
  return { taken, skipped, missed, expected, pct: expected ? Math.round((taken / expected) * 100) : null };
}

export type MedFilter = 'current' | 'past' | 'all';

/** O tratamento se sobrepõe ao período [from, to] (datas yyyy-MM-dd)? */
export function overlapsPeriod(
  m: Pick<Medication, 'startDate' | 'endDate' | 'continuous'>,
  from?: string,
  to?: string,
): boolean {
  if (to && parseDate(m.startDate) > endOfDay(parseDate(to))) return false;
  if (from && !m.continuous && m.endDate && endOfDay(parseDate(m.endDate)) < parseDate(from)) return false;
  return true;
}

export function matchesMedFilter(m: Pick<Medication, 'status'>, f: MedFilter): boolean {
  if (f === 'all') return true;
  return f === 'past' ? m.status === 'finished' : m.status !== 'finished';
}
