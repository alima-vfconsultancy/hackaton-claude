import { format } from 'date-fns';
import type { CalendarExporter, FileDownloader } from '../../application/ports';
import type { Medication } from '../../domain/medication';
import { intervalDividesDay, treatmentEnd } from '../../domain/schedule';
import { HOUR_MS, MINUTE_MS, parseLocalDate, withLocalTime } from '../../domain/time';
import { APP_NAME } from '../../shared/brand';
import { describeMedication } from '../../shared/ptBR/format';

export type IcsMedication = Pick<Medication, 'id' | 'name' | 'dosage' | 'instructions' | 'schedule' | 'period'>;

// "Floating" time (no time zone): the calendar app uses the phone's own zone.
const stamp = (date: Date) => format(date, "yyyyMMdd'T'HHmmss");

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** RFC 5545 line folding: lines are at most 75 octets, continuation lines start with a space. */
function foldLine(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = ' ' + rest.slice(74);
  }
  parts.push(rest);
  return parts.join('\r\n');
}

interface EventSeries {
  start: Date;
  rrule: string;
}

function buildSeries(medication: IcsMedication): EventSeries[] {
  const end = treatmentEnd(medication.period);
  const until = end ? `;UNTIL=${stamp(end)}` : '';
  const startDay = parseLocalDate(medication.period.startDate);
  const { schedule } = medication;

  if (schedule.type === 'fixedTimes') {
    return [...new Set(schedule.times)].filter(Boolean).sort().map((time) => ({
      start: withLocalTime(startDay, time),
      rrule: `FREQ=DAILY${until}`,
    }));
  }

  const hours = schedule.intervalHours;
  if (!(hours > 0)) return [];
  const first = withLocalTime(startDay, schedule.firstDoseTime || '08:00');
  if (intervalDividesDay(hours)) {
    // An interval that divides the day becomes one daily event per time (best calendar compatibility).
    return Array.from({ length: 24 / hours }, (_, k) => ({
      start: new Date(first.getTime() + k * hours * HOUR_MS),
      rrule: `FREQ=DAILY${until}`,
    }));
  }
  return [{ start: first, rrule: `FREQ=HOURLY;INTERVAL=${hours}${until}` }];
}

/**
 * Builds the iCalendar (.ics) text with one recurring event (and an alarm at the event time) per dose time.
 *
 * @param medication - medication whose schedule and period define the events
 * @param now - used for the `DTSTAMP` field
 */
export function buildIcs(medication: IcsMedication, now = new Date()): string {
  const title = `Tomar ${describeMedication(medication)}`;
  const description = [medication.instructions, `Lembrete criado pelo ${APP_NAME}. Confira sempre os dados com a receita.`]
    .filter(Boolean)
    .join(' - ');
  // PRODID and the event UIDs keep the old internal id, so re-imported reminders replace instead of duplicating.
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MeuRemedio//PT-BR//', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${APP_NAME}`,
  ];
  buildSeries(medication).forEach((series, index) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${medication.id}-${index}@meuremedio.app`,
      `DTSTAMP:${format(new Date(now.getTime() + now.getTimezoneOffset() * MINUTE_MS), "yyyyMMdd'T'HHmmss'Z'")}`,
      `DTSTART:${stamp(series.start)}`,
      `DTEND:${stamp(new Date(series.start.getTime() + 15 * MINUTE_MS))}`,
      `RRULE:${series.rrule}`,
      `SUMMARY:${escapeText(title)}`,
      `DESCRIPTION:${escapeText(description)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(title)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/** File name shown to the user, e.g. `lembretes-acido-folico.ics`. */
export function icsFileName(medication: Pick<Medication, 'name'>): string {
  const slug = medication.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `lembretes-${slug || 'remedio'}.ics`;
}

/** Calendar exporter that saves the `.ics` file through the given downloader. */
export const createIcsCalendarExporter = (files: FileDownloader): CalendarExporter => ({
  download(medication) {
    files.download(new Blob([buildIcs(medication)], { type: 'text/calendar;charset=utf-8' }), icsFileName(medication));
  },
});
