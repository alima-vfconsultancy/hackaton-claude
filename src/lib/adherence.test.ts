import { describe, expect, it } from 'vitest';
import { computeAdherence, matchesMedFilter, overlapsPeriod } from './adherence';

describe('computeAdherence', () => {
  const now = new Date(2026, 2, 10, 12).getTime();
  const at = (h: number) => new Date(2026, 2, 10, h).getTime();
  it('conta tomadas / previstas e ignora doses futuras', () => {
    const r = computeAdherence(
      [
        { status: 'taken', scheduledAt: at(6) },
        { status: 'skipped', scheduledAt: at(8) },
        { status: 'missed', scheduledAt: at(9) },
        { status: 'taken', scheduledAt: at(10) },
        { status: 'pending', scheduledAt: at(20) },
      ],
      now,
    );
    expect(r).toEqual({ taken: 2, skipped: 1, missed: 1, expected: 4, pct: 50 });
  });
  it('sem doses previstas não há percentual', () => {
    expect(computeAdherence([], now).pct).toBeNull();
  });
});

describe('filtros', () => {
  it('período sobrepõe tratamento', () => {
    const m = { startDate: '2026-03-10', endDate: '2026-03-16', continuous: false };
    expect(overlapsPeriod(m, '2026-03-16', '2026-03-20')).toBe(true);
    expect(overlapsPeriod(m, '2026-03-17', '2026-03-20')).toBe(false);
    expect(overlapsPeriod(m, '2026-03-01', '2026-03-09')).toBe(false);
    expect(overlapsPeriod({ ...m, continuous: true }, '2026-05-01', '2026-06-01')).toBe(true);
  });
  it('filtro atuais/encerrados', () => {
    expect(matchesMedFilter({ status: 'paused' }, 'current')).toBe(true);
    expect(matchesMedFilter({ status: 'finished' }, 'current')).toBe(false);
    expect(matchesMedFilter({ status: 'finished' }, 'past')).toBe(true);
    expect(matchesMedFilter({ status: 'finished' }, 'all')).toBe(true);
  });
});
