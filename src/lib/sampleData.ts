import { format, subDays } from 'date-fns';
import { createMedications } from '../db/repo';
import { emptyMedication } from './medicationDefaults';

export const SAMPLE_ENABLED = import.meta.env.DEV || import.meta.env.VITE_DEMO === 'true';

/** Dados de exemplo (apenas para demonstração). */
export async function loadSampleData(): Promise<void> {
  const today = new Date();
  const d = (n: number) => format(subDays(today, n), 'yyyy-MM-dd');
  const base = emptyMedication();
  await createMedications([
    {
      ...base, name: 'Amoxicilina', dosage: '500', unit: 'mg', form: 'cápsula', instructions: 'após as refeições',
      scheduleType: 'interval', intervalHours: 8, firstDoseTime: '06:00', startDate: d(1), durationDays: 7, prescriber: 'Dr. Carlos Almeida',
    },
    {
      ...base, name: 'Losartana', dosage: '50', unit: 'mg', form: 'comprimido', instructions: 'pela manhã',
      scheduleType: 'fixedTimes', times: ['08:00'], startDate: d(30), durationDays: undefined, continuous: true,
    },
    {
      ...base, name: 'Omeprazol', dosage: '20', unit: 'mg', form: 'cápsula', instructions: 'em jejum',
      scheduleType: 'fixedTimes', times: ['07:00', '21:00'], startDate: d(20), durationDays: 14,
    },
  ]);
}
