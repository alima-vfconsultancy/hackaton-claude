import { describe, expect, it } from 'vitest';
import { format } from 'date-fns';
import { computeEndDate, generateDoseTimes, previewText, previewTimes, type SchedulePart } from './schedule';
import { isMissed } from './doseRules';

const hhmm = (ts: number) => format(new Date(ts), 'dd/MM HH:mm');
const day = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

const base: SchedulePart = {
  scheduleType: 'interval',
  intervalHours: 8,
  firstDoseTime: '08:00',
  times: [],
  startDate: '2026-03-10',
  continuous: false,
};

describe('generateDoseTimes - intervalo', () => {
  it('de 8 em 8 horas atravessa a meia-noite', () => {
    const r = generateDoseTimes({ ...base, continuous: true }, day(2026, 3, 10), day(2026, 3, 11, 23, 59));
    expect(r.map(hhmm)).toEqual([
      '10/03 08:00', '10/03 16:00', '11/03 00:00', '11/03 08:00', '11/03 16:00',
    ]);
  });

  it('primeira dose às 20:00 de 12 em 12 gera dose às 08:00 do dia seguinte', () => {
    const s = { ...base, intervalHours: 12, firstDoseTime: '20:00', continuous: true };
    const r = generateDoseTimes(s, day(2026, 3, 10), day(2026, 3, 11, 23, 59));
    expect(r.map(hhmm)).toEqual(['10/03 20:00', '11/03 08:00', '11/03 20:00']);
  });

  it('não gera doses antes da data de início', () => {
    const r = generateDoseTimes({ ...base, continuous: true }, day(2026, 3, 1), day(2026, 3, 10, 12));
    expect(r.map(hhmm)).toEqual(['10/03 08:00']);
  });

  it('respeita a data de término (inclusiva até o fim do dia)', () => {
    const s = { ...base, endDate: '2026-03-10' };
    const r = generateDoseTimes(s, day(2026, 3, 10), day(2026, 3, 20));
    expect(r.map(hhmm)).toEqual(['10/03 08:00', '10/03 16:00']);
  });

  it('intervalo que não divide 24h continua sem reiniciar o dia', () => {
    const s = { ...base, intervalHours: 5, firstDoseTime: '08:00', continuous: true };
    const r = generateDoseTimes(s, day(2026, 3, 10), day(2026, 3, 11, 12));
    expect(r.map(hhmm)).toEqual(['10/03 08:00', '10/03 13:00', '10/03 18:00', '10/03 23:00', '11/03 04:00', '11/03 09:00']);
  });

  it('janela que começa no meio do tratamento mantém a mesma grade', () => {
    const r = generateDoseTimes({ ...base, continuous: true }, day(2026, 3, 12, 9), day(2026, 3, 13, 0));
    expect(r.map(hhmm)).toEqual(['12/03 16:00', '13/03 00:00']);
  });

  it('intervalo inválido não gera doses', () => {
    expect(generateDoseTimes({ ...base, intervalHours: 0 }, day(2026, 3, 10), day(2026, 3, 12))).toEqual([]);
  });
});

describe('generateDoseTimes - horários fixos', () => {
  const fixed: SchedulePart = {
    scheduleType: 'fixedTimes', times: ['20:00', '08:00'], firstDoseTime: '08:00',
    startDate: '2026-03-10', continuous: true,
  };

  it('gera horários ordenados em cada dia', () => {
    const r = generateDoseTimes(fixed, day(2026, 3, 10), day(2026, 3, 11, 23, 59));
    expect(r.map(hhmm)).toEqual(['10/03 08:00', '10/03 20:00', '11/03 08:00', '11/03 20:00']);
  });

  it('para no último dia do tratamento', () => {
    const r = generateDoseTimes({ ...fixed, continuous: false, endDate: '2026-03-11' }, day(2026, 3, 10), day(2026, 3, 30));
    expect(r).toHaveLength(4);
  });

  it('uso contínuo ignora endDate', () => {
    const r = generateDoseTimes({ ...fixed, endDate: '2026-03-10' }, day(2026, 3, 10), day(2026, 3, 12, 23, 59));
    expect(r).toHaveLength(6);
  });

  it('ignora horários repetidos ou inválidos', () => {
    const r = generateDoseTimes({ ...fixed, times: ['08:00', '08:00', 'abc'] }, day(2026, 3, 10), day(2026, 3, 10, 23, 59));
    expect(r.map(hhmm)).toEqual(['10/03 08:00']);
  });

  it('janela parcial só traz doses dentro dela', () => {
    const r = generateDoseTimes(fixed, day(2026, 3, 10, 9), day(2026, 3, 11, 9));
    expect(r.map(hhmm)).toEqual(['10/03 20:00', '11/03 08:00']);
  });
});

describe('computeEndDate / prévia', () => {
  it('7 dias a partir de 10/03 termina em 16/03', () => {
    expect(computeEndDate('2026-03-10', 7)).toBe('2026-03-16');
  });
  it('1 dia termina no mesmo dia', () => {
    expect(computeEndDate('2026-03-10', 1)).toBe('2026-03-10');
  });
  it('prévia de 8 em 8 horas', () => {
    expect(previewTimes(base)).toEqual(['08:00', '16:00', '00:00']);
    expect(previewText(base)).toBe('Você tomará às 08:00, 16:00 e 00:00');
  });
  it('prévia de horários fixos', () => {
    const s = { ...base, scheduleType: 'fixedTimes' as const, times: ['21:00', '09:00'] };
    expect(previewText(s)).toBe('Você tomará às 09:00 e 21:00');
  });
  it('prévia vazia quando faltam dados', () => {
    expect(previewText({ ...base, intervalHours: undefined })).toBe('');
  });
});

describe('regra de dose perdida', () => {
  const sched = day(2026, 3, 10, 8).getTime();
  it('pendente com mais de 2h de atraso vira perdida', () => {
    expect(isMissed({ status: 'pending', scheduledAt: sched }, day(2026, 3, 10, 10, 1).getTime())).toBe(true);
  });
  it('pendente com menos de 2h continua pendente', () => {
    expect(isMissed({ status: 'pending', scheduledAt: sched }, day(2026, 3, 10, 9, 59).getTime())).toBe(false);
  });
  it('adiada conta a partir do novo horário', () => {
    const d = { status: 'snoozed' as const, scheduledAt: sched, snoozedUntil: day(2026, 3, 10, 11).getTime() };
    expect(isMissed(d, day(2026, 3, 10, 12).getTime())).toBe(false);
    expect(isMissed(d, day(2026, 3, 10, 13, 1).getTime())).toBe(true);
  });
  it('dose já tomada nunca vira perdida', () => {
    expect(isMissed({ status: 'taken', scheduledAt: sched }, day(2026, 3, 20).getTime())).toBe(false);
  });
});
