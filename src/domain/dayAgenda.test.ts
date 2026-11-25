import { describe, expect, it } from 'vitest';
import { buildDayAgenda } from './dayAgenda';

const day = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const DAY_START = day(2026, 3, 10);
const DAY_END = day(2026, 3, 10, 23, 59);

describe('buildDayAgenda', () => {
  it('returns an empty agenda when there are no medications or doses', () => {
    expect(buildDayAgenda([], [], DAY_START, DAY_END)).toEqual([]);
  });
});
