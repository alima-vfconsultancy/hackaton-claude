import { format } from 'date-fns';
import type { Medication, MedicationInput } from '../types';
import { parseDate } from './schedule';

export function emptyMedication(): MedicationInput {
  const now = new Date();
  return {
    name: '',
    dosage: '',
    unit: 'mg',
    form: 'comprimido',
    instructions: '',
    scheduleType: 'interval',
    intervalHours: 8,
    firstDoseTime: format(now, 'HH:00') > '23:00' ? '08:00' : format(new Date(now.getTime() + 3_600_000), 'HH:00'),
    times: ['08:00', '20:00'],
    startDate: format(now, 'yyyy-MM-dd'),
    endDate: undefined,
    durationDays: 7,
    continuous: false,
    status: 'active',
    prescriber: '',
    notes: '',
  };
}

export function toInput(m: Medication): MedicationInput {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, createdAt, updatedAt, trackFrom, ...rest } = m;
  return rest;
}

/** Mensagens de erro que dizem o que fazer. */
export function validateMedication(m: MedicationInput): string[] {
  const errs: string[] = [];
  if (!m.name.trim()) errs.push('Escreva o nome do remédio.');
  if (m.scheduleType === 'interval') {
    if (!m.intervalHours || m.intervalHours <= 0) errs.push('Informe de quantas em quantas horas você toma (por exemplo, 8).');
    else if (m.intervalHours > 168) errs.push('O intervalo é muito grande. Use um valor de até 168 horas.');
    if (!m.firstDoseTime) errs.push('Escolha o horário da primeira dose.');
  } else if (m.times.filter(Boolean).length === 0) {
    errs.push('Adicione pelo menos um horário.');
  }
  if (!m.startDate) errs.push('Escolha a data de início.');
  if (!m.continuous) {
    if (m.durationDays !== undefined && m.durationDays <= 0) errs.push('A duração deve ser de pelo menos 1 dia.');
    if (m.durationDays === undefined && !m.endDate) errs.push('Informe por quantos dias vai tomar, a data final ou marque uso contínuo.');
    if (m.endDate && m.startDate && parseDate(m.endDate) < parseDate(m.startDate)) {
      errs.push('A data final deve ser igual ou depois da data de início.');
    }
  }
  return errs;
}
