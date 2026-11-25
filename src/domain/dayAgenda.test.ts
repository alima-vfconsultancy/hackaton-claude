import { describe, expect, it } from 'vitest';
import type { DoseLog } from './dose';
import type { Medication } from './medication';
import { buildDayAgenda } from './dayAgenda';

const day = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const DAY_START = day(2026, 3, 10);
const DAY_END = day(2026, 3, 10, 23, 59);

/** A valid medication for this test file; override any field. Mirrors the interval schedule
 * used by `schedule.test.ts`'s `everyEightHours` fixture (8h interval from 08:00, 2026-03-10). */
function buildMedication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'med-1',
    name: 'Amoxicilina',
    dosage: { amount: 500, unit: 'mg' },
    form: 'capsule',
    instructions: '',
    schedule: { type: 'interval', intervalHours: 8, firstDoseTime: '08:00' },
    period: { startDate: '2026-03-10', endDate: '2026-03-16' },
    status: 'active',
    prescriber: '',
    notes: '',
    dosesTrackedFrom: 0,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

/** A valid dose for this test file; override any field. */
function buildDose(overrides: Partial<DoseLog> = {}): DoseLog {
  return { id: 'dose-1', medicationId: 'med-1', scheduledAt: 0, status: 'pending', ...overrides };
}

describe('buildDayAgenda', () => {
  it('returns an empty agenda when there are no medications or doses', () => {
    expect(buildDayAgenda([], [], DAY_START, DAY_END)).toEqual([]);
  });

  it('includes logged doses of medications that still exist, ignoring orphans', () => {
    const medication = buildMedication({ id: 'med-1', status: 'paused' });
    const doses = [
      buildDose({ id: 'a', medicationId: 'med-1', scheduledAt: day(2026, 3, 10, 8).getTime() }),
      buildDose({ id: 'orphan', medicationId: 'gone', scheduledAt: day(2026, 3, 10, 9).getTime() }),
    ];

    const result = buildDayAgenda([medication], doses, DAY_START, DAY_END);

    expect(result).toEqual([{ kind: 'logged', medication, dose: doses[0] }]);
  });

  it('predicts doses for an active medication that has no log yet on this day', () => {
    const medication = buildMedication({ id: 'med-1', status: 'active' });

    const result = buildDayAgenda([medication], [], DAY_START, DAY_END);

    expect(result).toEqual([
      { kind: 'planned', medication, scheduledAt: day(2026, 3, 10, 8).getTime() },
      { kind: 'planned', medication, scheduledAt: day(2026, 3, 10, 16).getTime() },
    ]);
  });

  it('does not predict a planned entry when a log already exists at that exact instant', () => {
    const medication = buildMedication({ id: 'med-1', status: 'active' });
    const dose = buildDose({ id: 'a', medicationId: 'med-1', scheduledAt: day(2026, 3, 10, 8).getTime() });

    const result = buildDayAgenda([medication], [dose], DAY_START, DAY_END);

    expect(result.filter((e) => e.kind === 'planned')).toHaveLength(1); // only 16:00 remains
    expect(result.filter((e) => e.kind === 'logged')).toHaveLength(1);
  });

  it('sorts logged and planned entries together by effective time', () => {
    const medication = buildMedication({ id: 'med-1', status: 'active' });
    // snoozed 08:00 dose is now effectively at 20:00, so it should sort after the 16:00 planned entry
    const dose = buildDose({
      id: 'a', medicationId: 'med-1', status: 'snoozed',
      scheduledAt: day(2026, 3, 10, 8).getTime(), snoozedUntil: day(2026, 3, 10, 20).getTime(),
    });

    const result = buildDayAgenda([medication], [dose], DAY_START, DAY_END);

    expect(result.map((e) => (e.kind === 'logged' ? 'logged' : 'planned'))).toEqual(['planned', 'logged']);
  });
});
