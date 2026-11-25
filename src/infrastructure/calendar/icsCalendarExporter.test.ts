import { describe, expect, it, vi } from 'vitest';
import { buildMedication } from '../../application/testing/inMemoryPorts';
import { buildIcs, createIcsCalendarExporter, icsFileName } from './icsCalendarExporter';

const base = buildMedication({ id: 'abc', instructions: 'após as refeições' });
const now = new Date(2026, 2, 9, 12, 0);

describe('buildIcs', () => {
  it('creates one daily event per dose time with RRULE, UNTIL and VALARM', () => {
    const ics = buildIcs(base, now);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(ics).toContain('DTSTART:20260310T080000');
    expect(ics).toContain('DTSTART:20260310T160000');
    expect(ics).toContain('DTSTART:20260311T000000'); // the 3rd dose crosses midnight
    expect(ics).toContain('RRULE:FREQ=DAILY;UNTIL=20260316T235959');
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(3);
    expect(ics).toContain('TRIGGER:PT0M');
    expect(ics).toContain('SUMMARY:Tomar Amoxicilina (500 mg)');
  });

  it('uses FREQ=HOURLY when the interval does not divide 24h', () => {
    const ics = buildIcs({ ...base, schedule: { type: 'interval', intervalHours: 5, firstDoseTime: '08:00' } }, now);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain('RRULE:FREQ=HOURLY;INTERVAL=5;UNTIL=20260316T235959');
  });

  it('has no UNTIL for continuous treatments', () => {
    expect(buildIcs({ ...base, period: { startDate: '2026-03-10' } }, now)).not.toContain('UNTIL');
  });

  it('turns each fixed time into its own event', () => {
    const ics = buildIcs({ ...base, schedule: { type: 'fixedTimes', times: ['21:00', '09:00'] } }, now);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('DTSTART:20260310T090000');
  });

  it('omits the dosage from the title when there is none', () => {
    expect(buildIcs({ ...base, dosage: null }, now)).toContain('SUMMARY:Tomar Amoxicilina\r\n');
  });

  it('uses CRLF line breaks and closes the calendar', () => {
    const ics = buildIcs(base, now);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });
});

describe('icsFileName', () => {
  it('removes accents from the name', () => {
    expect(icsFileName({ name: 'Ácido Fólico' })).toBe('lembretes-acido-folico.ics');
  });
  it('falls back to a generic name', () => {
    expect(icsFileName({ name: '???' })).toBe('lembretes-remedio.ics');
  });
});

describe('createIcsCalendarExporter', () => {
  it('hands the calendar file to the downloader', () => {
    const download = vi.fn();

    createIcsCalendarExporter({ download }).download(base);

    expect(download).toHaveBeenCalledOnce();
    const [blob, fileName] = download.mock.calls[0];
    expect(fileName).toBe('lembretes-amoxicilina.ics');
    expect((blob as Blob).type).toContain('text/calendar');
  });
});
