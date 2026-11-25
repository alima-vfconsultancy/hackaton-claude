import { describe, expect, it } from 'vitest';
import { buildIcs, icsFileName } from './ics';

const base = {
  id: 'abc', name: 'Amoxicilina', dosage: '500', unit: 'mg', instructions: 'após as refeições',
  scheduleType: 'interval' as const, intervalHours: 8, firstDoseTime: '08:00', times: [],
  startDate: '2026-03-10', endDate: '2026-03-16', continuous: false,
};
const now = new Date(2026, 2, 9, 12, 0);

describe('buildIcs', () => {
  it('gera um evento diário por horário com RRULE, UNTIL e VALARM', () => {
    const ics = buildIcs(base, now);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(ics).toContain('DTSTART:20260310T080000');
    expect(ics).toContain('DTSTART:20260310T160000');
    expect(ics).toContain('DTSTART:20260311T000000'); // 3ª dose cruza a meia-noite
    expect(ics).toContain('RRULE:FREQ=DAILY;UNTIL=20260316T235959');
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(3);
    expect(ics).toContain('TRIGGER:PT0M');
    expect(ics).toContain('SUMMARY:Tomar Amoxicilina (500 mg)');
  });
  it('intervalo que não divide 24h usa FREQ=HOURLY', () => {
    const ics = buildIcs({ ...base, intervalHours: 5 }, now);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain('RRULE:FREQ=HOURLY;INTERVAL=5;UNTIL=20260316T235959');
  });
  it('uso contínuo não tem UNTIL', () => {
    const ics = buildIcs({ ...base, continuous: true, endDate: undefined }, now);
    expect(ics).not.toContain('UNTIL');
  });
  it('horários fixos viram um evento cada', () => {
    const ics = buildIcs({ ...base, scheduleType: 'fixedTimes', times: ['21:00', '09:00'] }, now);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('DTSTART:20260310T090000');
  });
  it('usa CRLF e termina o calendário', () => {
    const ics = buildIcs(base, now);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });
  it('nome de arquivo sem acentos', () => {
    expect(icsFileName({ name: 'Ácido Fólico' })).toBe('lembretes-acido-folico.ics');
  });
});
