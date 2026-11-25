import { describe, expect, it } from 'vitest';
import type { MedicationDraft } from '../../domain/medication';
import {
  buildMedicationDraft, createEmptyFormValues, medicationToFormValues, type MedicationFormValues,
} from './medicationFormValues';

const now = new Date(2026, 2, 10, 9, 30);
const valid = (): MedicationFormValues => ({ ...createEmptyFormValues(now), name: 'Amoxicilina' });

describe('createEmptyFormValues', () => {
  it('starts with a 7-day treatment, every 8 hours, and no dosage', () => {
    const values = createEmptyFormValues(now);
    expect(values).toMatchObject({
      dosageAmount: '', scheduleType: 'interval', intervalHours: 8, firstDoseTime: '10:00',
      startDate: '2026-03-10', endMode: 'days', durationDays: 7, status: 'active',
    });
  });
});

describe('medicationToFormValues', () => {
  it('shows a dosage with a decimal comma and keeps the concentration', () => {
    const draft: MedicationDraft = { ...buildMedicationDraft(valid()).draft, dosage: { amount: 0.5, unit: 'mg', perMl: 5 } };
    expect(medicationToFormValues(draft)).toMatchObject({ dosageAmount: '0,5', dosageUnit: 'mg', dosagePerMl: 5 });
  });

  it('shows a continuous treatment without duration', () => {
    const draft = { ...buildMedicationDraft(valid()).draft, period: { startDate: '2026-03-10' } };
    expect(medicationToFormValues(draft)).toMatchObject({ endMode: 'continuous', durationDays: undefined, endDate: '' });
  });

  it('derives the number of days from the period (end date is inclusive)', () => {
    const draft = { ...buildMedicationDraft(valid()).draft, period: { startDate: '2026-03-10', endDate: '2026-03-16' } };
    expect(medicationToFormValues(draft)).toMatchObject({ endMode: 'days', durationDays: 7, endDate: '2026-03-16' });
  });

  it('can show a stored bounded treatment by its last day', () => {
    const draft = { ...buildMedicationDraft(valid()).draft, period: { startDate: '2026-03-10', endDate: '2026-03-16' } };
    expect(medicationToFormValues(draft, 'date')).toMatchObject({ endMode: 'date', endDate: '2026-03-16' });
  });

  it('keeps defaults for the schedule type that is not in use', () => {
    const draft = { ...buildMedicationDraft(valid()).draft, schedule: { type: 'fixedTimes' as const, times: ['07:00'] } };
    expect(medicationToFormValues(draft)).toMatchObject({ scheduleType: 'fixedTimes', times: ['07:00'], intervalHours: 8, firstDoseTime: '07:00' });
  });
});

describe('buildMedicationDraft', () => {
  it('builds a draft for a valid form', () => {
    const { draft, issues } = buildMedicationDraft({ ...valid(), dosageAmount: '0,5', dosageUnit: 'tablets' });
    expect(issues).toEqual([]);
    expect(draft.dosage).toEqual({ amount: 0.5, unit: 'tablets' });
    expect(draft.schedule).toEqual({ type: 'interval', intervalHours: 8, firstDoseTime: '10:00' });
    expect(draft.period).toEqual({ startDate: '2026-03-10', endDate: '2026-03-16' });
  });

  it('round-trips a draft through the form', () => {
    const original = buildMedicationDraft({ ...valid(), dosageAmount: '250', dosagePerMl: 5, scheduleType: 'fixedTimes', times: ['08:00', '20:00'] }).draft;
    expect(buildMedicationDraft(medicationToFormValues(original)).draft).toEqual(original);
  });

  it('has no dosage when the amount is empty', () => {
    expect(buildMedicationDraft({ ...valid(), dosageAmount: '  ' }).draft.dosage).toBeNull();
  });

  it('flags a dosage that is not a positive number', () => {
    expect(buildMedicationDraft({ ...valid(), dosageAmount: 'abc' }).issues).toEqual(['dosage_invalid']);
    expect(buildMedicationDraft({ ...valid(), dosageAmount: '0' }).issues).toEqual(['dosage_invalid']);
  });

  it('has no end date for continuous use', () => {
    const { draft, issues } = buildMedicationDraft({ ...valid(), endMode: 'continuous' });
    expect(issues).toEqual([]);
    expect(draft.period).toEqual({ startDate: '2026-03-10' });
  });

  it('uses the chosen end date', () => {
    const { draft } = buildMedicationDraft({ ...valid(), endMode: 'date', endDate: '2026-04-01' });
    expect(draft.period).toEqual({ startDate: '2026-03-10', endDate: '2026-04-01' });
  });

  it('asks for a duration or an end date', () => {
    expect(buildMedicationDraft({ ...valid(), durationDays: undefined }).issues).toEqual(['duration_required']);
    expect(buildMedicationDraft({ ...valid(), endMode: 'date', endDate: '' }).issues).toEqual(['duration_required']);
    expect(buildMedicationDraft({ ...valid(), durationDays: 0 }).issues).toEqual(['duration_invalid']);
  });

  it('adds the domain rules to the form rules', () => {
    const { issues } = buildMedicationDraft({ ...valid(), name: '', intervalHours: 200, endMode: 'date', endDate: '2026-03-01' });
    expect(issues).toEqual(['name_required', 'interval_too_long', 'end_before_start']);
  });

  it('does not crash when the start date is empty', () => {
    expect(buildMedicationDraft({ ...valid(), startDate: '' }).issues).toContain('start_date_required');
  });
});
