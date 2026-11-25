import { describe, expect, it } from 'vitest';
import { effectiveTime, isMissed, isOpen } from './dose';

const day = (h: number, min = 0, d = 10) => new Date(2026, 2, d, h, min).getTime();
const scheduledAt = day(8);

describe('isMissed', () => {
  it('turns a pending dose into missed after 2 hours of delay', () => {
    expect(isMissed({ status: 'pending', scheduledAt }, day(10, 1))).toBe(true);
  });
  it('keeps a pending dose pending within 2 hours', () => {
    expect(isMissed({ status: 'pending', scheduledAt }, day(9, 59))).toBe(false);
  });
  it('counts a snoozed dose from its new time', () => {
    const dose = { status: 'snoozed' as const, scheduledAt, snoozedUntil: day(11) };
    expect(isMissed(dose, day(12))).toBe(false);
    expect(isMissed(dose, day(13, 1))).toBe(true);
  });
  it('never marks a taken dose as missed', () => {
    expect(isMissed({ status: 'taken', scheduledAt }, day(0, 0, 20))).toBe(false);
  });
});

describe('isOpen', () => {
  it('is true only for pending and snoozed doses', () => {
    expect(isOpen({ status: 'pending' })).toBe(true);
    expect(isOpen({ status: 'snoozed' })).toBe(true);
    expect(isOpen({ status: 'taken' })).toBe(false);
    expect(isOpen({ status: 'missed' })).toBe(false);
  });
});

describe('effectiveTime', () => {
  it('uses the snooze time only for snoozed doses', () => {
    expect(effectiveTime({ status: 'snoozed', scheduledAt, snoozedUntil: day(9) })).toBe(day(9));
    expect(effectiveTime({ status: 'pending', scheduledAt, snoozedUntil: day(9) })).toBe(scheduledAt);
  });
});
