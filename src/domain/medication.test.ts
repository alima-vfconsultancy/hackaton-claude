import { describe, expect, it } from 'vitest';
import {
  createEmptyMedicationDraft, isContinuous, normalizeMedicationDraft, validateMedicationDraft, type MedicationDraft,
} from './medication';

const valid = (): MedicationDraft => ({
  ...createEmptyMedicationDraft(new Date(2026, 2, 10, 9)),
  name: 'Amoxicilina',
});

describe('createEmptyMedicationDraft', () => {
  it('starts every 8 hours at the next full hour, for 7 days', () => {
    const draft = createEmptyMedicationDraft(new Date(2026, 2, 10, 9, 30));
    expect(draft.schedule).toEqual({ type: 'interval', intervalHours: 8, firstDoseTime: '10:00' });
    expect(draft.period).toEqual({ startDate: '2026-03-10', endDate: '2026-03-16' });
    expect(draft.status).toBe('active');
  });

  it('falls back to a morning dose when the next full hour is tomorrow', () => {
    const draft = createEmptyMedicationDraft(new Date(2026, 2, 10, 23, 30));
    expect(draft.schedule).toMatchObject({ firstDoseTime: '08:00' });
  });
});

describe('validateMedicationDraft', () => {
  it('accepts a complete draft', () => {
    expect(validateMedicationDraft(valid())).toEqual([]);
  });

  it('requires a name', () => {
    expect(validateMedicationDraft({ ...valid(), name: '   ' })).toEqual(['name_required']);
  });

  it('rejects missing, zero and oversized intervals', () => {
    const withInterval = (intervalHours: number): MedicationDraft => ({
      ...valid(), schedule: { type: 'interval', intervalHours, firstDoseTime: '08:00' },
    });
    expect(validateMedicationDraft(withInterval(0))).toEqual(['interval_required']);
    expect(validateMedicationDraft(withInterval(Number.NaN))).toEqual(['interval_required']);
    expect(validateMedicationDraft(withInterval(169))).toEqual(['interval_too_long']);
  });

  it('requires the first dose time of an interval schedule', () => {
    const draft: MedicationDraft = { ...valid(), schedule: { type: 'interval', intervalHours: 8, firstDoseTime: '' } };
    expect(validateMedicationDraft(draft)).toEqual(['first_dose_required']);
  });

  it('requires at least one fixed time', () => {
    const draft: MedicationDraft = { ...valid(), schedule: { type: 'fixedTimes', times: ['', ''] } };
    expect(validateMedicationDraft(draft)).toEqual(['times_required']);
  });

  it('requires a start date and an end date that is not before it', () => {
    expect(validateMedicationDraft({ ...valid(), period: { startDate: '' } })).toEqual(['start_date_required']);
    expect(validateMedicationDraft({ ...valid(), period: { startDate: '2026-03-10', endDate: '2026-03-09' } })).toEqual(['end_before_start']);
    expect(validateMedicationDraft({ ...valid(), period: { startDate: '2026-03-10', endDate: '2026-03-10' } })).toEqual([]);
  });
});

describe('normalizeMedicationDraft', () => {
  it('trims the name', () => {
    expect(normalizeMedicationDraft({ ...valid(), name: '  Losartana ' }).name).toBe('Losartana');
  });
});

describe('isContinuous', () => {
  it('is true only when there is no end date', () => {
    expect(isContinuous({ startDate: '2026-03-10' })).toBe(true);
    expect(isContinuous({ startDate: '2026-03-10', endDate: '2026-03-12' })).toBe(false);
  });
});
