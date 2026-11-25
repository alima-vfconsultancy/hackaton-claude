/**
 * Default form behavior when the prescription reading does not return a required field.
 * It only concerns the form: it looks at the parser's suggestion but never changes the OCR or the parser.
 *
 * Rule: a required field the prescription did not provide is left EMPTY and highlighted until the user fills it in.
 * The app never invents values for health data (e.g. "every 8 hours", "7 days").
 */
import type { PrescriptionSuggestion } from '../../application/prescriptionParser';
import type { MedicationFormIssueCode, MedicationFormValues } from './medicationFormValues';
import { buildMedicationDraft } from './medicationFormValues';

export type RequiredField = 'name' | 'schedule' | 'duration';
export type RequiredFieldFlags = Partial<Record<RequiredField, boolean>>;

/** Every required field: used when no medication could be recognized in the prescription. */
export const ALL_REQUIRED_FIELDS: Readonly<Required<RequiredFieldFlags>> = { name: true, schedule: true, duration: true };

const FIELD_BY_ISSUE: Partial<Record<MedicationFormIssueCode, RequiredField>> = {
  name_required: 'name',
  interval_required: 'schedule',
  first_dose_required: 'schedule',
  times_required: 'schedule',
  duration_required: 'duration',
};

/**
 * Tells which required fields the prescription reading did not return.
 *
 * @param suggestion - parser output for one medication
 * @returns flags set only for the fields that are absent from the suggestion
 */
export function detectUnreadFields(suggestion: PrescriptionSuggestion): RequiredFieldFlags {
  const unread: RequiredFieldFlags = {};
  if (!suggestion.name.trim()) unread.name = true;
  if (!suggestion.schedule) unread.schedule = true;
  if (!suggestion.duration) unread.duration = true;
  return unread;
}

/**
 * Removes the filler values (the draft's defaults) from the fields the reading did not return,
 * so the form does not present them as if they had come from the prescription.
 *
 * @param values - form state built from the suggestion's draft
 * @param unread - result of `detectUnreadFields`
 * @returns a copy of the form state with those fields emptied; everything that was read is kept
 */
export function clearUnreadValues(values: MedicationFormValues, unread: RequiredFieldFlags): MedicationFormValues {
  const cleared = { ...values };
  if (unread.name) cleared.name = '';
  if (unread.schedule) {
    cleared.intervalHours = undefined;
    cleared.times = [];
  }
  if (unread.duration) {
    cleared.endMode = 'days';
    cleared.durationDays = undefined;
    cleared.endDate = '';
  }
  return cleared;
}

/**
 * Lists the required fields that are empty right now. Reuses the domain/form validation, so it
 * never disagrees with what blocks saving. Wrong-but-filled values are not "empty" (they are validation errors).
 *
 * @param values - current form state
 * @returns flags set only for the required fields that still need a value
 */
export function findEmptyRequiredFields(values: MedicationFormValues): RequiredFieldFlags {
  const empty: RequiredFieldFlags = {};
  for (const code of buildMedicationDraft(values).issues) {
    const field = FIELD_BY_ISSUE[code];
    if (field) empty[field] = true;
  }
  return empty;
}
