import { addDays, format } from 'date-fns';
import { formatLocalDate, HOUR_MS, parseLocalDate, type EpochMs, type LocalDate, type LocalTime } from './time';

export type TreatmentStatus = 'active' | 'paused' | 'finished';

export type MedicationForm = 'tablet' | 'capsule' | 'liquid' | 'drops' | 'ointment' | 'injection' | 'other';

export const MEDICATION_FORMS: readonly MedicationForm[] = [
  'tablet', 'capsule', 'liquid', 'drops', 'ointment', 'injection', 'other',
];

export type DosageUnit =
  | 'mg' | 'g' | 'mcg' | 'ml' | 'iu' | 'percent'
  | 'drops' | 'tablets' | 'capsules' | 'ampoules' | 'spoonfuls' | 'sachets' | 'applications'
  | 'other';

/** Units offered when the user fills the dosage by hand (parser may add the others). */
export const DOSAGE_UNITS: readonly DosageUnit[] = [
  'mg', 'g', 'mcg', 'ml', 'drops', 'tablets', 'capsules', 'iu', 'applications', 'other',
];

/** Amount taken at once (or strength of the product, e.g. `500 mg`). */
export interface Dosage {
  amount: number;
  unit: DosageUnit;
  /** Reference volume in ml for concentrations such as `250 mg/5 ml`. */
  perMl?: number;
}

export type ScheduleType = 'interval' | 'fixedTimes';

/** When the doses happen: every N hours, or at fixed times of the day. */
export type Schedule =
  | { type: 'interval'; intervalHours: number; firstDoseTime: LocalTime }
  | { type: 'fixedTimes'; times: LocalTime[] };

/** `endDate` is inclusive; when it is absent the treatment is continuous. */
export interface TreatmentPeriod {
  startDate: LocalDate;
  endDate?: LocalDate;
}

/** Everything the user decides about a medication (before it is persisted). */
export interface MedicationDraft {
  name: string;
  dosage: Dosage | null;
  form: MedicationForm;
  instructions: string;
  schedule: Schedule;
  period: TreatmentPeriod;
  status: TreatmentStatus;
  prescriber: string;
  notes: string;
  /** Raw OCR text the draft came from (audit trail). */
  sourceOcrText?: string;
}

export interface Medication extends MedicationDraft {
  id: string;
  /** Id of the stored prescription thumbnail, when the user kept one. */
  photoId?: string;
  /** Moment from which doses are generated (avoids fake "missed" doses for past start dates). */
  dosesTrackedFrom: EpochMs;
  createdAt: EpochMs;
  updatedAt: EpochMs;
}

/** True when the treatment has no end date. */
export const isContinuous = (period: TreatmentPeriod): boolean => !period.endDate;

/** How far before "now" doses start being tracked for a new or resumed schedule. */
export const TRACKING_LOOKBACK_MS = 2 * HOUR_MS;

export type MedicationIssueCode =
  | 'name_required'
  | 'interval_required'
  | 'interval_too_long'
  | 'first_dose_required'
  | 'times_required'
  | 'start_date_required'
  | 'end_before_start';

export const MAX_INTERVAL_HOURS = 168;

/** Checks the business rules of a draft. Returns codes (empty when valid); texts live in the UI layer. */
export function validateMedicationDraft(draft: MedicationDraft): MedicationIssueCode[] {
  const issues: MedicationIssueCode[] = [];
  if (!draft.name.trim()) issues.push('name_required');

  const { schedule, period } = draft;
  if (schedule.type === 'interval') {
    if (!(schedule.intervalHours > 0)) issues.push('interval_required');
    else if (schedule.intervalHours > MAX_INTERVAL_HOURS) issues.push('interval_too_long');
    if (!schedule.firstDoseTime) issues.push('first_dose_required');
  } else if (schedule.times.filter(Boolean).length === 0) {
    issues.push('times_required');
  }

  if (!period.startDate) issues.push('start_date_required');
  if (period.endDate && period.startDate && parseLocalDate(period.endDate) < parseLocalDate(period.startDate)) {
    issues.push('end_before_start');
  }
  return issues;
}

/** Cleans a draft before it is stored (trims the name). */
export const normalizeMedicationDraft = (draft: MedicationDraft): MedicationDraft => ({
  ...draft,
  name: draft.name.trim(),
});

/** Default values for a brand-new medication: every 8 hours for 7 days, starting at the next full hour. */
export function createEmptyMedicationDraft(now: Date = new Date()): MedicationDraft {
  // From 23:00 on, the "next full hour" would fall on the next day, so fall back to a morning dose.
  const firstDoseTime = now.getHours() >= 23 ? '08:00' : format(new Date(now.getTime() + HOUR_MS), 'HH:00');
  return {
    name: '',
    dosage: null,
    form: 'tablet',
    instructions: '',
    schedule: { type: 'interval', intervalHours: 8, firstDoseTime },
    period: { startDate: formatLocalDate(now), endDate: formatLocalDate(addDays(now, 6)) },
    status: 'active',
    prescriber: '',
    notes: '',
  };
}
