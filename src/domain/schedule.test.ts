import { describe, expect, it } from 'vitest';
import { format } from 'date-fns';
import { computeEndDate, generateDoseTimes, intervalDividesDay, previewTimes, type Treatment } from './schedule';

const label = (timestamp: number) => format(new Date(timestamp), 'dd/MM HH:mm');
const day = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

const everyEightHours: Treatment = {
  schedule: { type: 'interval', intervalHours: 8, firstDoseTime: '08:00' },
  period: { startDate: '2026-03-10' },
};
const withInterval = (intervalHours: number, firstDoseTime = '08:00'): Treatment => ({
  ...everyEightHours,
  schedule: { type: 'interval', intervalHours, firstDoseTime },
});
const withFixedTimes = (times: string[], endDate?: string): Treatment => ({
  schedule: { type: 'fixedTimes', times },
  period: { startDate: '2026-03-10', endDate },
});

describe('generateDoseTimes with an interval schedule', () => {
  it('keeps the 8-hour grid across midnight', () => {
    const result = generateDoseTimes(everyEightHours, day(2026, 3, 10), day(2026, 3, 11, 23, 59));
    expect(result.map(label)).toEqual(['10/03 08:00', '10/03 16:00', '11/03 00:00', '11/03 08:00', '11/03 16:00']);
  });

  it('continues into the next day when the first dose is at 20:00 every 12 hours', () => {
    const result = generateDoseTimes(withInterval(12, '20:00'), day(2026, 3, 10), day(2026, 3, 11, 23, 59));
    expect(result.map(label)).toEqual(['10/03 20:00', '11/03 08:00', '11/03 20:00']);
  });

  it('never generates doses before the start date', () => {
    const result = generateDoseTimes(everyEightHours, day(2026, 3, 1), day(2026, 3, 10, 12));
    expect(result.map(label)).toEqual(['10/03 08:00']);
  });

  it('includes the whole last day of the treatment (inclusive end date)', () => {
    const treatment: Treatment = { ...everyEightHours, period: { startDate: '2026-03-10', endDate: '2026-03-10' } };
    const result = generateDoseTimes(treatment, day(2026, 3, 10), day(2026, 3, 20));
    expect(result.map(label)).toEqual(['10/03 08:00', '10/03 16:00']);
  });

  it('keeps going without restarting the day when the interval does not divide 24h', () => {
    const result = generateDoseTimes(withInterval(5), day(2026, 3, 10), day(2026, 3, 11, 12));
    expect(result.map(label)).toEqual(['10/03 08:00', '10/03 13:00', '10/03 18:00', '10/03 23:00', '11/03 04:00', '11/03 09:00']);
  });

  it('keeps the same grid when the window starts in the middle of the treatment', () => {
    const result = generateDoseTimes(everyEightHours, day(2026, 3, 12, 9), day(2026, 3, 13, 0));
    expect(result.map(label)).toEqual(['12/03 16:00', '13/03 00:00']);
  });

  it('generates nothing for an invalid interval', () => {
    expect(generateDoseTimes(withInterval(0), day(2026, 3, 10), day(2026, 3, 12))).toEqual([]);
  });
});

describe('generateDoseTimes with fixed times', () => {
  it('lists the times of each day in ascending order', () => {
    const result = generateDoseTimes(withFixedTimes(['20:00', '08:00']), day(2026, 3, 10), day(2026, 3, 11, 23, 59));
    expect(result.map(label)).toEqual(['10/03 08:00', '10/03 20:00', '11/03 08:00', '11/03 20:00']);
  });

  it('stops at the last day of the treatment', () => {
    const result = generateDoseTimes(withFixedTimes(['20:00', '08:00'], '2026-03-11'), day(2026, 3, 10), day(2026, 3, 30));
    expect(result).toHaveLength(4);
  });

  it('keeps going forever when there is no end date', () => {
    const result = generateDoseTimes(withFixedTimes(['20:00', '08:00']), day(2026, 3, 10), day(2026, 3, 12, 23, 59));
    expect(result).toHaveLength(6);
  });

  it('ignores repeated or malformed times', () => {
    const result = generateDoseTimes(withFixedTimes(['08:00', '08:00', 'abc']), day(2026, 3, 10), day(2026, 3, 10, 23, 59));
    expect(result.map(label)).toEqual(['10/03 08:00']);
  });

  it('only returns doses inside a partial window', () => {
    const result = generateDoseTimes(withFixedTimes(['20:00', '08:00']), day(2026, 3, 10, 9), day(2026, 3, 11, 9));
    expect(result.map(label)).toEqual(['10/03 20:00', '11/03 08:00']);
  });
});

describe('computeEndDate', () => {
  it('ends on 16/03 for 7 days starting 10/03', () => {
    expect(computeEndDate('2026-03-10', 7)).toBe('2026-03-16');
  });
  it('ends on the same day for a 1-day treatment', () => {
    expect(computeEndDate('2026-03-10', 1)).toBe('2026-03-10');
  });
});

describe('previewTimes', () => {
  it('lists the times within 24h for an 8-hour interval', () => {
    expect(previewTimes(everyEightHours.schedule)).toEqual(['08:00', '16:00', '00:00']);
  });
  it('sorts and zero-pads fixed times', () => {
    expect(previewTimes({ type: 'fixedTimes', times: ['21:00', '9:00'] })).toEqual(['09:00', '21:00']);
  });
  it('is empty when the data is incomplete', () => {
    expect(previewTimes({ type: 'interval', intervalHours: 0, firstDoseTime: '08:00' })).toEqual([]);
    expect(previewTimes({ type: 'fixedTimes', times: [] })).toEqual([]);
  });
});

describe('intervalDividesDay', () => {
  it('detects intervals that divide 24h evenly', () => {
    expect(intervalDividesDay(8)).toBe(true);
    expect(intervalDividesDay(5)).toBe(false);
    expect(intervalDividesDay(0)).toBe(false);
  });
});
