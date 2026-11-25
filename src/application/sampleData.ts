import { subDays } from 'date-fns';
import { createEmptyMedicationDraft, type MedicationDraft } from '../domain/medication';
import { computeEndDate } from '../domain/schedule';
import { formatLocalDate } from '../domain/time';
import type { MedicationService } from './medicationService';

/** Demo medications (Brazilian names and notes on purpose), starting at different days in the past. */
export function buildSampleDrafts(today: Date = new Date()): MedicationDraft[] {
  const startedDaysAgo = (days: number) => formatLocalDate(subDays(today, days));
  const base = createEmptyMedicationDraft(today);
  const bounded = (daysAgo: number, durationDays: number) => {
    const startDate = startedDaysAgo(daysAgo);
    return { startDate, endDate: computeEndDate(startDate, durationDays) };
  };

  return [
    {
      ...base, name: 'Amoxicilina', dosage: { amount: 500, unit: 'mg' }, form: 'capsule', instructions: 'após as refeições',
      schedule: { type: 'interval', intervalHours: 8, firstDoseTime: '06:00' }, period: bounded(1, 7), prescriber: 'Dr. Carlos Almeida',
    },
    {
      ...base, name: 'Losartana', dosage: { amount: 50, unit: 'mg' }, form: 'tablet', instructions: 'pela manhã',
      schedule: { type: 'fixedTimes', times: ['08:00'] }, period: { startDate: startedDaysAgo(30) },
    },
    {
      ...base, name: 'Omeprazol', dosage: { amount: 20, unit: 'mg' }, form: 'capsule', instructions: 'em jejum',
      schedule: { type: 'fixedTimes', times: ['07:00', '21:00'] }, period: bounded(20, 14),
    },
  ];
}

export interface SampleDataService {
  /** Adds demo medications (development and demo builds only). */
  load(): Promise<void>;
}

/** Builds the demo-data use case on top of the medication service. */
export const createSampleDataService = (medications: MedicationService): SampleDataService => ({
  load: async () => void (await medications.create(buildSampleDrafts())),
});
