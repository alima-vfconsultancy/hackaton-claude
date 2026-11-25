import { describe, expect, it } from 'vitest';
import {
  describeFrequency, describeMedication, describePeriod, describeSchedulePreview, formatDate, formatDosage, joinWithAnd,
} from './format';

describe('formatDosage', () => {
  it('writes amount and unit with a decimal comma', () => {
    expect(formatDosage({ amount: 500, unit: 'mg' })).toBe('500 mg');
    expect(formatDosage({ amount: 0.5, unit: 'tablets' })).toBe('0,5 comprimido(s)');
  });
  it('writes concentrations per volume', () => {
    expect(formatDosage({ amount: 250, unit: 'mg', perMl: 5 })).toBe('250 mg/5ml');
    expect(formatDosage({ amount: 10, unit: 'mg', perMl: 1 })).toBe('10 mg/ml');
  });
  it('is empty without a dosage', () => {
    expect(formatDosage(null)).toBe('');
  });
});

describe('describeFrequency and describePeriod', () => {
  it('describes interval and fixed schedules', () => {
    expect(describeFrequency({ type: 'interval', intervalHours: 8, firstDoseTime: '08:00' })).toBe('De 8 em 8 horas');
    expect(describeFrequency({ type: 'fixedTimes', times: ['20:00', '08:00'] })).toBe('Às 08:00 e 20:00');
  });
  it('describes bounded and continuous periods', () => {
    expect(describePeriod({ startDate: '2026-03-10', endDate: '2026-03-16' })).toBe('10/03/2026 até 16/03/2026');
    expect(describePeriod({ startDate: '2026-03-10' })).toBe('10/03/2026 até uso contínuo');
  });
});

describe('describeSchedulePreview', () => {
  it('lists the times for an 8-hour interval', () => {
    expect(describeSchedulePreview({ type: 'interval', intervalHours: 8, firstDoseTime: '08:00' }))
      .toBe('Você tomará às 08:00, 16:00 e 00:00');
  });
  it('warns when the interval does not divide the day', () => {
    expect(describeSchedulePreview({ type: 'interval', intervalHours: 5, firstDoseTime: '08:00' })).toContain('os horários mudam');
  });
  it('lists fixed times and is empty when data is missing', () => {
    expect(describeSchedulePreview({ type: 'fixedTimes', times: ['21:00', '09:00'] })).toBe('Você tomará às 09:00 e 21:00');
    expect(describeSchedulePreview({ type: 'interval', intervalHours: 0, firstDoseTime: '08:00' })).toBe('');
  });
});

describe('small helpers', () => {
  it('joins lists in Portuguese', () => {
    expect(joinWithAnd(['a'])).toBe('a');
    expect(joinWithAnd(['a', 'b', 'c'])).toBe('a, b e c');
  });
  it('shows a dash for a missing date', () => {
    expect(formatDate(undefined)).toBe('—');
  });
  it('titles a medication with its dosage when there is one', () => {
    expect(describeMedication({ name: 'Amoxicilina', dosage: { amount: 500, unit: 'mg' } })).toBe('Amoxicilina (500 mg)');
    expect(describeMedication({ name: 'Amoxicilina', dosage: null })).toBe('Amoxicilina');
  });
});
