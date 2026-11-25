import { describe, expect, it } from 'vitest';
import { parsePrescription, suggestionToDraft } from '../../application/prescriptionParser';
import {
  ALL_REQUIRED_FIELDS, clearUnreadValues, detectUnreadFields, findEmptyRequiredFields,
} from './missingRequiredFields';
import { createEmptyFormValues, medicationToFormValues } from './medicationFormValues';

const TODAY = '2026-03-10';

/** Same path the review screen follows, so these tests cover the real combination. */
function reviewValuesFor(text: string) {
  const suggestion = parsePrescription(text)[0];
  const unread = detectUnreadFields(suggestion);
  const values = clearUnreadValues(medicationToFormValues(suggestionToDraft(suggestion, TODAY, text)), unread);
  return { unread, values };
}

describe('detectUnreadFields', () => {
  it('reports nothing for a complete prescription line', () => {
    expect(reviewValuesFor('Amoxicilina 500mg de 8 em 8 horas por 7 dias').unread).toEqual({});
  });

  it('reports the schedule when the prescription gives no frequency', () => {
    expect(reviewValuesFor('Amoxicilina 500mg por 7 dias').unread).toEqual({ schedule: true });
  });

  it('reports the duration when the prescription gives no duration', () => {
    expect(reviewValuesFor('Dipirona 500 mg 6/6h').unread).toEqual({ duration: true });
  });

  it('treats continuous use as a duration that was read', () => {
    expect(reviewValuesFor('Losartana 50mg 1x ao dia uso contínuo').unread.duration).toBeUndefined();
  });

  it('reports the name when the suggestion has none', () => {
    const suggestion = { ...parsePrescription('Dipirona 500 mg 6/6h por 5 dias')[0], name: '  ' };
    expect(detectUnreadFields(suggestion)).toEqual({ name: true });
  });
});

describe('clearUnreadValues', () => {
  it('leaves the form untouched when everything was read', () => {
    const text = 'Amoxicilina 500mg de 8 em 8 horas por 7 dias';
    const values = medicationToFormValues(suggestionToDraft(parsePrescription(text)[0], TODAY, text));
    expect(clearUnreadValues(values, {})).toEqual(values);
  });

  it('empties the schedule instead of showing an invented "every 8 hours"', () => {
    const { values } = reviewValuesFor('Amoxicilina 500mg por 7 dias');
    expect(values.intervalHours).toBeUndefined();
    expect(values.times).toEqual([]);
    expect(values.durationDays).toBe(7); // what was read is kept
  });

  it('empties the duration instead of showing an invented "7 days"', () => {
    const { values } = reviewValuesFor('Dipirona 500 mg 6/6h');
    expect(values).toMatchObject({ endMode: 'days', durationDays: undefined, endDate: '' });
    expect(values.intervalHours).toBe(6); // what was read is kept
  });

  it('empties every required field when nothing was recognized', () => {
    const values = clearUnreadValues(createEmptyFormValues(), ALL_REQUIRED_FIELDS);
    expect(findEmptyRequiredFields(values)).toEqual(ALL_REQUIRED_FIELDS);
  });
});

describe('findEmptyRequiredFields', () => {
  const blank = () => clearUnreadValues(createEmptyFormValues(), ALL_REQUIRED_FIELDS);

  it('lists nothing for a filled-in form', () => {
    expect(findEmptyRequiredFields({ ...createEmptyFormValues(), name: 'Dipirona' })).toEqual({});
  });

  it('drops a field from the list as soon as the user fills it in', () => {
    expect(findEmptyRequiredFields({ ...blank(), name: 'Dipirona' }).name).toBeUndefined();
    expect(findEmptyRequiredFields({ ...blank(), intervalHours: 6 }).schedule).toBeUndefined();
    expect(findEmptyRequiredFields({ ...blank(), scheduleType: 'fixedTimes', times: ['08:00'] }).schedule).toBeUndefined();
    expect(findEmptyRequiredFields({ ...blank(), durationDays: 5 }).duration).toBeUndefined();
    expect(findEmptyRequiredFields({ ...blank(), endMode: 'continuous' }).duration).toBeUndefined();
    expect(findEmptyRequiredFields({ ...blank(), endMode: 'date', endDate: '2026-04-01' }).duration).toBeUndefined();
  });

  it('does not report a value that is filled but wrong (that is a validation error, not a missing field)', () => {
    expect(findEmptyRequiredFields({ ...createEmptyFormValues(), name: 'X', intervalHours: 500 })).toEqual({});
  });
});
