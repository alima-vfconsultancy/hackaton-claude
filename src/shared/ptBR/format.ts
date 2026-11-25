import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { intervalDividesDay, previewTimes } from '../../domain/schedule';
import type { Dosage, DosageUnit, Medication, Schedule, TreatmentPeriod } from '../../domain/medication';
import { parseLocalDate, type EpochMs, type LocalDate } from '../../domain/time';
import { DOSAGE_UNIT_LABELS } from './labels';

export const formatTime = (timestamp: EpochMs): string => format(new Date(timestamp), 'HH:mm');

export const formatDateTime = (timestamp: EpochMs): string =>
  format(new Date(timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

/** `dd/MM/yyyy`, or an em dash when there is no date. */
export const formatDate = (value?: LocalDate): string => (value ? format(parseLocalDate(value), 'dd/MM/yyyy') : '—');

export const formatDayLong = (date: Date): string => format(date, "EEEE, d 'de' MMMM", { locale: ptBR });

/** Numbers use a decimal comma in Brazilian Portuguese. */
export const formatAmount = (amount: number): string => String(amount).replace('.', ',');

/** `a, b e c` */
export function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

/** `mg`, `mg/5ml`, `gotas`: the unit alone, with the reference volume of a concentration when there is one. */
export function formatDosageUnit(unit: DosageUnit, perMl?: number): string {
  const concentration = perMl === undefined ? '' : perMl === 1 ? '/ml' : `/${formatAmount(perMl)}ml`;
  return `${DOSAGE_UNIT_LABELS[unit]}${concentration}`;
}

/** `500 mg`, `250 mg/5ml`, `20 gotas`; empty when there is no dosage. */
export function formatDosage(dosage: Dosage | null): string {
  return dosage ? `${formatAmount(dosage.amount)} ${formatDosageUnit(dosage.unit, dosage.perMl)}` : '';
}

export function describeFrequency(schedule: Schedule): string {
  if (schedule.type === 'interval') {
    return schedule.intervalHours ? `De ${schedule.intervalHours} em ${schedule.intervalHours} horas` : '—';
  }
  const times = [...schedule.times].sort();
  return times.length ? `Às ${joinWithAnd(times)}` : '—';
}

export function describePeriod(period: TreatmentPeriod): string {
  const end = period.endDate ? formatDate(period.endDate) : 'uso contínuo';
  return `${formatDate(period.startDate)} até ${end}`;
}

/** Sentence shown under the schedule fields, e.g. "Você tomará às 08:00, 16:00 e 00:00". */
export function describeSchedulePreview(schedule: Schedule): string {
  const times = previewTimes(schedule);
  if (times.length === 0) return '';
  let text = `Você tomará às ${joinWithAnd(times)}`;
  if (schedule.type === 'interval' && !intervalDividesDay(schedule.intervalHours)) {
    text += ' (nos dias seguintes os horários mudam, pois o intervalo não divide o dia)';
  }
  return text;
}

/** Title used for reminders, calendar events and the dose cards. */
export const describeMedication = (medication: Pick<Medication, 'name' | 'dosage'>): string => {
  const dosage = formatDosage(medication.dosage);
  return dosage ? `${medication.name} (${dosage})` : medication.name;
};
