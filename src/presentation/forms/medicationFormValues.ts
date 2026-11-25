import { differenceInCalendarDays } from 'date-fns';
import {
  createEmptyMedicationDraft, validateMedicationDraft,
  type Dosage, type DosageUnit, type MedicationDraft, type MedicationForm, type MedicationIssueCode,
  type ScheduleType, type TreatmentStatus,
} from '../../domain/medication';
import { computeEndDate } from '../../domain/schedule';
import { parseLocalDate } from '../../domain/time';
import { formatAmount } from '../../shared/ptBR/format';

/** How the user chose to say when the treatment ends. */
export type EndMode = 'continuous' | 'days' | 'date';

/**
 * Flat, text-friendly state of the medication form.
 * It keeps both schedule types and both end modes so switching between them loses nothing;
 * `buildMedicationDraft` picks what applies.
 */
export interface MedicationFormValues {
  name: string;
  /** Text typed by the user (decimal comma allowed); empty means "no dosage". */
  dosageAmount: string;
  dosageUnit: DosageUnit;
  /** Reference volume kept from a concentration read by the OCR (e.g. 250 mg/5 ml). */
  dosagePerMl?: number;
  form: MedicationForm;
  instructions: string;
  scheduleType: ScheduleType;
  intervalHours: number | undefined;
  firstDoseTime: string;
  times: string[];
  startDate: string;
  endMode: EndMode;
  durationDays: number | undefined;
  endDate: string;
  prescriber: string;
  notes: string;
  status: TreatmentStatus;
  sourceOcrText?: string;
}

export type MedicationFormIssueCode = MedicationIssueCode | 'dosage_invalid' | 'duration_invalid' | 'duration_required';

const DEFAULT_INTERVAL_HOURS = 8;
const DEFAULT_FIRST_DOSE_TIME = '08:00';
const DEFAULT_FIXED_TIMES = ['08:00', '20:00'];

/**
 * Turns a draft (new or stored) into form state.
 * @param boundedMode - how a bounded treatment is shown: "N days" for new drafts; stored medications use `'date'`
 *   so that editing the start date does not silently move the chosen last day
 */
export function medicationToFormValues(
  draft: MedicationDraft,
  boundedMode: Exclude<EndMode, 'continuous'> = 'days',
): MedicationFormValues {
  const { schedule, period } = draft;
  const durationDays = period.endDate
    ? Math.max(1, differenceInCalendarDays(parseLocalDate(period.endDate), parseLocalDate(period.startDate)) + 1)
    : undefined;
  return {
    name: draft.name,
    dosageAmount: draft.dosage ? formatAmount(draft.dosage.amount) : '',
    dosageUnit: draft.dosage?.unit ?? 'mg',
    dosagePerMl: draft.dosage?.perMl,
    form: draft.form,
    instructions: draft.instructions,
    scheduleType: schedule.type,
    intervalHours: schedule.type === 'interval' ? schedule.intervalHours : DEFAULT_INTERVAL_HOURS,
    firstDoseTime: schedule.type === 'interval' ? schedule.firstDoseTime : schedule.times[0] ?? DEFAULT_FIRST_DOSE_TIME,
    times: schedule.type === 'fixedTimes' ? schedule.times : DEFAULT_FIXED_TIMES,
    startDate: period.startDate,
    endMode: period.endDate ? boundedMode : 'continuous',
    durationDays,
    endDate: period.endDate ?? '',
    prescriber: draft.prescriber,
    notes: draft.notes,
    status: draft.status,
    sourceOcrText: draft.sourceOcrText,
  };
}

export const createEmptyFormValues = (now: Date = new Date()): MedicationFormValues =>
  medicationToFormValues(createEmptyMedicationDraft(now));

function parseDosage(values: MedicationFormValues): { dosage: Dosage | null; isValid: boolean } {
  const text = values.dosageAmount.trim();
  if (!text) return { dosage: null, isValid: true };
  const amount = Number(text.replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) return { dosage: null, isValid: false };
  const dosage: Dosage = { amount, unit: values.dosageUnit };
  if (values.dosagePerMl !== undefined) dosage.perMl = values.dosagePerMl;
  return { dosage, isValid: true };
}

/**
 * Converts the form state into a draft and lists everything the user must still fix
 * (form-level problems first, then the domain rules). The draft is only meant to be saved when `issues` is empty.
 */
export function buildMedicationDraft(values: MedicationFormValues): { draft: MedicationDraft; issues: MedicationFormIssueCode[] } {
  const issues: MedicationFormIssueCode[] = [];

  const { dosage, isValid: hasValidDosage } = parseDosage(values);
  if (!hasValidDosage) issues.push('dosage_invalid');

  let endDate: string | undefined;
  if (values.endMode === 'days') {
    if (values.durationDays === undefined) issues.push('duration_required');
    else if (!(values.durationDays > 0)) issues.push('duration_invalid');
    else if (values.startDate) endDate = computeEndDate(values.startDate, values.durationDays);
  } else if (values.endMode === 'date') {
    if (values.endDate) endDate = values.endDate;
    else issues.push('duration_required');
  }

  const draft: MedicationDraft = {
    name: values.name,
    dosage,
    form: values.form,
    instructions: values.instructions,
    schedule: values.scheduleType === 'interval'
      ? { type: 'interval', intervalHours: values.intervalHours ?? 0, firstDoseTime: values.firstDoseTime }
      : { type: 'fixedTimes', times: values.times },
    period: endDate ? { startDate: values.startDate, endDate } : { startDate: values.startDate },
    status: values.status,
    prescriber: values.prescriber,
    notes: values.notes,
    sourceOcrText: values.sourceOcrText,
  };

  issues.push(...validateMedicationDraft(draft));
  return { draft, issues: [...new Set(issues)] };
}
