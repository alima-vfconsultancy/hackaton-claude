import { format } from 'date-fns';
import type { Medication } from '../types';
import { doseLabel } from './format';
import { downloadBlob } from './download';
import { parseDate, setTime, treatmentEnd } from './schedule';

type IcsMed = Pick<
  Medication,
  'id' | 'name' | 'dosage' | 'unit' | 'instructions' | 'scheduleType' | 'intervalHours' | 'firstDoseTime' | 'times' | 'startDate' | 'endDate' | 'continuous'
>;

const stamp = (d: Date) => format(d, "yyyyMMdd'T'HHmmss"); // horário "flutuante" (fuso do celular)

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ' ' + rest.slice(74);
  }
  out.push(rest);
  return out.join('\r\n');
}

interface Series {
  start: Date;
  rrule: string;
}

function buildSeries(m: IcsMed): Series[] {
  const end = treatmentEnd(m);
  const until = end ? `;UNTIL=${stamp(end)}` : '';
  const startDay = parseDate(m.startDate);

  if (m.scheduleType === 'fixedTimes') {
    return [...new Set(m.times)].filter(Boolean).sort().map((t) => ({
      start: setTime(startDay, t),
      rrule: `FREQ=DAILY${until}`,
    }));
  }
  const h = m.intervalHours ?? 0;
  if (!(h > 0)) return [];
  const first = setTime(startDay, m.firstDoseTime || '08:00');
  if (24 % h === 0) {
    // Intervalo que divide o dia: um evento diário por horário (mais compatível com calendários).
    const n = 24 / h;
    return Array.from({ length: n }, (_, k) => ({
      start: new Date(first.getTime() + k * h * 3_600_000),
      rrule: `FREQ=DAILY${until}`,
    }));
  }
  return [{ start: first, rrule: `FREQ=HOURLY;INTERVAL=${h}${until}` }];
}

export function buildIcs(m: IcsMed, now = new Date()): string {
  const series = buildSeries(m);
  const title = `Tomar ${m.name}${doseLabel(m) ? ` (${doseLabel(m)})` : ''}`;
  const desc = [m.instructions, 'Lembrete criado pelo MeuRemédio. Confira sempre os dados com a receita.'].filter(Boolean).join(' - ');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MeuRemedio//PT-BR//', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:MeuRemédio'];
  series.forEach((s, i) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${m.id}-${i}@meuremedio.app`,
      `DTSTAMP:${format(new Date(now.getTime() + now.getTimezoneOffset() * 60000), "yyyyMMdd'T'HHmmss'Z'")}`,
      `DTSTART:${stamp(s.start)}`,
      `DTEND:${stamp(new Date(s.start.getTime() + 15 * 60_000))}`,
      `RRULE:${s.rrule}`,
      `SUMMARY:${esc(title)}`,
      `DESCRIPTION:${esc(desc)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(title)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function icsFileName(m: Pick<Medication, 'name'>): string {
  return `lembretes-${m.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'remedio'}.ics`;
}

export function downloadIcs(m: IcsMed): void {
  const blob = new Blob([buildIcs(m)], { type: 'text/calendar;charset=utf-8' });
  downloadBlob(blob, icsFileName(m));
}

