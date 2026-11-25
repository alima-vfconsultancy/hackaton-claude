import { addDays, endOfDay, format, parse, startOfDay } from 'date-fns';
import type { Medication } from '../types';

export type SchedulePart = Pick<
  Medication,
  'scheduleType' | 'intervalHours' | 'firstDoseTime' | 'times' | 'startDate' | 'endDate' | 'continuous'
>;

const HOUR = 3_600_000;

export const parseDate = (s: string): Date => parse(s, 'yyyy-MM-dd', new Date());
export const toDateStr = (d: Date): string => format(d, 'yyyy-MM-dd');

export function setTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(day);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

/** endDate é inclusivo: o tratamento vai até 23:59:59 desse dia. */
export function computeEndDate(startDate: string, durationDays: number): string {
  return toDateStr(addDays(parseDate(startDate), durationDays - 1));
}

export function treatmentEnd(s: Pick<SchedulePart, 'continuous' | 'endDate'>): Date | null {
  if (s.continuous || !s.endDate) return null;
  return endOfDay(parseDate(s.endDate));
}

/** Horários (ms) das doses previstas no intervalo [from, to]. */
export function generateDoseTimes(s: SchedulePart, from: Date, to: Date): number[] {
  const end = treatmentEnd(s);
  const limit = end && end < to ? end : to;
  const out: number[] = [];
  const start = parseDate(s.startDate);

  if (s.scheduleType === 'interval') {
    const h = s.intervalHours ?? 0;
    if (!(h > 0)) return out;
    const step = h * HOUR;
    const first = setTime(start, s.firstDoseTime || '08:00').getTime();
    const k0 = Math.max(0, Math.ceil((from.getTime() - first) / step));
    for (let t = first + k0 * step; t <= limit.getTime(); t += step) out.push(t);
    return out;
  }

  const times = [...new Set(s.times)].filter((t) => /^\d{1,2}:\d{2}$/.test(t)).sort();
  if (times.length === 0) return out;
  let day = startOfDay(from) > start ? startOfDay(from) : start;
  while (day <= limit) {
    for (const hhmm of times) {
      const t = setTime(day, hhmm).getTime();
      if (t >= from.getTime() && t <= limit.getTime()) out.push(t);
    }
    day = addDays(day, 1);
  }
  return out;
}

/** Horários HH:mm que o usuário verá no primeiro dia / em 24h. */
export function previewTimes(s: Pick<SchedulePart, 'scheduleType' | 'intervalHours' | 'firstDoseTime' | 'times'>): string[] {
  if (s.scheduleType === 'fixedTimes') {
    return [...new Set(s.times)].filter((t) => /^\d{1,2}:\d{2}$/.test(t)).map(pad).sort();
  }
  const h = s.intervalHours ?? 0;
  if (!(h > 0) || !s.firstDoseTime) return [];
  const base = setTime(new Date(2000, 0, 1), s.firstDoseTime).getTime();
  const out: string[] = [];
  for (let k = 0; k * h < 24 && out.length < 24; k++) out.push(format(new Date(base + k * h * HOUR), 'HH:mm'));
  return out;
}

function pad(t: string): string {
  const [h, m] = t.split(':');
  return `${h.padStart(2, '0')}:${m}`;
}

export function joinPt(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

export function previewText(s: Pick<SchedulePart, 'scheduleType' | 'intervalHours' | 'firstDoseTime' | 'times'>): string {
  const list = previewTimes(s);
  if (list.length === 0) return '';
  let text = `Você tomará às ${joinPt(list)}`;
  if (s.scheduleType === 'interval' && s.intervalHours && 24 % s.intervalHours !== 0) {
    text += ' (nos dias seguintes os horários mudam, pois o intervalo não divide o dia)';
  }
  return text;
}
