import { describe, expect, it } from 'vitest';
import { computeAdherence, matchesTreatmentFilter, overlapsPeriod } from './adherence';

describe('computeAdherence', () => {
  const now = new Date(2026, 2, 10, 12).getTime();
  const at = (hour: number) => new Date(2026, 2, 10, hour).getTime();

  it('counts taken over planned doses and ignores future ones', () => {
    const result = computeAdherence(
      [
        { status: 'taken', scheduledAt: at(6) },
        { status: 'skipped', scheduledAt: at(8) },
        { status: 'missed', scheduledAt: at(9) },
        { status: 'taken', scheduledAt: at(10) },
        { status: 'pending', scheduledAt: at(20) },
      ],
      now,
    );
    expect(result).toEqual({ taken: 2, skipped: 1, missed: 1, expected: 4, percentage: 50 });
  });

  it('has no percentage while no dose was planned yet', () => {
    expect(computeAdherence([], now).percentage).toBeNull();
  });
});

describe('overlapsPeriod', () => {
  const medication = { period: { startDate: '2026-03-10', endDate: '2026-03-16' } };

  it('detects treatments that touch the period', () => {
    expect(overlapsPeriod(medication, '2026-03-16', '2026-03-20')).toBe(true);
    expect(overlapsPeriod(medication, '2026-03-17', '2026-03-20')).toBe(false);
    expect(overlapsPeriod(medication, '2026-03-01', '2026-03-09')).toBe(false);
  });
  it('treats continuous treatments as open-ended', () => {
    expect(overlapsPeriod({ period: { startDate: '2026-03-10' } }, '2026-05-01', '2026-06-01')).toBe(true);
  });
});

describe('matchesTreatmentFilter', () => {
  it('keeps active and paused treatments as "current"', () => {
    expect(matchesTreatmentFilter({ status: 'paused' }, 'current')).toBe(true);
    expect(matchesTreatmentFilter({ status: 'finished' }, 'current')).toBe(false);
  });
  it('keeps only finished treatments as "past" and everything as "all"', () => {
    expect(matchesTreatmentFilter({ status: 'finished' }, 'past')).toBe(true);
    expect(matchesTreatmentFilter({ status: 'active' }, 'past')).toBe(false);
    expect(matchesTreatmentFilter({ status: 'finished' }, 'all')).toBe(true);
  });
});
